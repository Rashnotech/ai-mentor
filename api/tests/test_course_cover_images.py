"""Free regression tests for course image contracts and actual handler payloads.

Handlers are compiled from source with boundary dependencies substituted so this
suite needs neither a database nor the production Python dependency set.
"""
import ast
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://images.example.com/course.jpg?version=2'


def load_handler(filename, name, namespace):
    tree = ast.parse((ROOT / 'domains/courses/routes' / filename).read_text())
    fn = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == name)
    fn.decorator_list = []
    for arg in fn.args.args:
        arg.annotation = None
    fn.args.defaults = []
    fn.returns = None
    exec(compile(ast.Module(body=[fn], type_ignores=[]), filename, 'exec'), namespace)
    return namespace[name]


class CourseCoverTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.course = SimpleNamespace(
            course_id=7, title='Python', slug='python', description='Python course',
            estimated_hours=10, difficulty_level='BEGINNER', is_active=True,
            cover_image_url=URL, prerequisites=[], what_youll_learn=[],
            certificate_on_completion=False, average_rating=0, total_reviews=0,
            created_by='admin', created_at=datetime(2026, 1, 1), updated_at=datetime(2026, 1, 1),
        )
        self.db = SimpleNamespace(execute=AsyncMock(), commit=AsyncMock(), refresh=AsyncMock())
        expression = Mock()
        expression.where.return_value = expression
        expression.order_by.return_value = expression
        expression.offset.return_value = expression
        expression.limit.return_value = expression
        expression.join.return_value = expression
        self.namespace = dict(
            CourseResponse=lambda **kw: kw, CourseListResponse=lambda **kw: kw,
            CourseBriefResponse=lambda **kw: kw, Course=Mock(), LearningPath=Mock(),
            Module=Mock(), select=Mock(return_value=expression), func=Mock(),
            UserRole=SimpleNamespace(ADMIN='admin', MENTOR='mentor'), logger=Mock(),
            HTTPException=type('HTTPException', (Exception,), {}), AppError=type('AppError', (Exception,), {}),
            _get_public_learning_paths=AsyncMock(return_value=[]),
        )

    def test_all_course_response_contracts_keep_cover_image(self):
        tree = ast.parse((ROOT / 'domains/courses/schemas/course_schema.py').read_text())
        for name in ['CourseResponse', 'CourseListResponse', 'CourseBriefResponse']:
            with self.subTest(schema=name):
                cls = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == name)
                self.assertIn('cover_image_url', [n.target.id for n in cls.body if isinstance(n, ast.AnnAssign)])

    async def test_create_passes_and_returns_cover_image(self):
        service = SimpleNamespace(create_course=AsyncMock(return_value=self.course))
        self.namespace['CourseService'] = Mock(return_value=service)
        request = SimpleNamespace(**vars(self.course))
        handler = load_handler('admin.py', 'create_course', self.namespace)
        result = await handler(request, {'role': 'admin'}, self.db)
        self.assertEqual(service.create_course.await_args.kwargs['cover_image_url'], URL)
        self.assertEqual(result['cover_image_url'], URL)

    async def test_update_replaces_clears_and_preserves_omitted_image(self):
        for supplied, value, expected in [(True, URL + '&new=1', URL + '&new=1'), (True, '', ''), (True, None, None), (False, None, URL)]:
            with self.subTest(supplied=supplied, value=value):
                self.course.cover_image_url = URL
                self.db.execute.return_value = SimpleNamespace(scalar_one_or_none=lambda: self.course)
                fields = dict(title=None, description=None, slug=None, estimated_hours=None, difficulty_level=None,
                              is_active=None, prerequisites=None, what_youll_learn=None, certificate_on_completion=None,
                              cover_image_url=value, model_fields_set={'cover_image_url'} if supplied else set())
                handler = load_handler('admin.py', 'update_course', self.namespace)
                result = await handler(7, SimpleNamespace(**fields), {'role': 'admin'}, self.db)
                self.assertEqual(self.course.cover_image_url, expected)
                self.assertEqual(result['cover_image_url'], expected)
                self.db.commit.assert_awaited()

    async def test_admin_list_returns_saved_image(self):
        self.db.execute.side_effect = [SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [self.course])),
                                       SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))]
        handler = load_handler('admin.py', 'list_courses', self.namespace)
        result = await handler(None, None, None, 50, 0, False, {'role': 'admin'}, self.db)
        self.assertEqual(result[0]['cover_image_url'], URL)

    async def test_public_list_and_details_return_saved_image(self):
        for name, args, listing in [('list_public_courses', [None, None, 50, 0], True),
                                    ('get_public_course_by_slug', ['python'], False),
                                    ('get_public_course', [7], False)]:
            with self.subTest(endpoint=name):
                course_result = SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [self.course]),
                                                scalar_one_or_none=lambda: self.course)
                self.db.execute.side_effect = [course_result] + [SimpleNamespace(scalar=lambda: 0)] * 3
                handler = load_handler('public.py', name, self.namespace)
                result = await handler(*args, self.db)
                self.assertEqual((result[0] if listing else result)['cover_image_url'], URL)

    def test_every_course_response_builder_forwards_image(self):
        for filename in ['admin.py', 'public.py']:
            tree = ast.parse((ROOT / 'domains/courses/routes' / filename).read_text())
            for call in ast.walk(tree):
                if isinstance(call, ast.Call) and isinstance(call.func, ast.Name) and call.func.id in {'CourseResponse', 'CourseListResponse', 'CourseBriefResponse'}:
                    with self.subTest(file=filename, line=call.lineno):
                        self.assertIn('cover_image_url', [kw.arg for kw in call.keywords])


if __name__ == '__main__':
    unittest.main()
