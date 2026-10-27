"""Deterministic course image contract evaluation; requires a 100% pass rate.

No model calls: image URL persistence and forwarding are deterministic behavior.
Run: python api/evals/course_cover_images_eval.py
"""
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / 'tests/test_course_cover_images.py'
spec = importlib.util.spec_from_file_location('course_cover_tests', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

suite = unittest.TestSuite()
for value in ['https://images.example.com/cover.png', '/images/python-cover.jpg',
              'https://cdn.example.com/course%20cover.webp?token=abc&v=2', '', None]:
    class ImageScenario(module.CourseCoverTests):
        def setUp(self, image=value):
            super().setUp()
            module.URL = image
            self.course.cover_image_url = image

    # Evaluate read paths for external, relative, signed, empty and absent covers.
    for name in ['test_admin_list_returns_saved_image', 'test_public_list_and_details_return_saved_image']:
        suite.addTest(ImageScenario(name))

result = unittest.TextTestRunner(verbosity=2).run(suite)
print(f'Course image eval: {result.testsRun - len(result.failures) - len(result.errors)}/{result.testsRun} passed; threshold 100%')
raise SystemExit(not result.wasSuccessful())
