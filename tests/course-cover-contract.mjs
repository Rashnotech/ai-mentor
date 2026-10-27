import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const admin = readFileSync('app/admin/courses/page-client.tsx', 'utf8')
function handler(name, next, context) {
  const source = admin.slice(admin.indexOf(`  const ${name} =`), admin.indexOf(`  const ${next} =`))
  const js = ts.transpile(source + `\n${name}`, { target: ts.ScriptTarget.ES2022 })
  return vm.runInNewContext(js, context)
}
export function runCoverChecks() {
  const checks = []
  const check = (name, fn) => { fn(); checks.push(name) }
  const form = { title:'Python', slug:'python', description:'Course', estimated_hours:10, difficulty_level:'BEGINNER', is_active:true, cover_image_url:'  https://cdn.example.org/python.jpg?size=large  ', prerequisites:'', what_youll_learn:'', certificate_on_completion:true }
  const context = { courseForm:form, validateCourseForm:()=>({}), sanitizeString:s=>s, setFormErrors:()=>{}, toast:{ error:()=>assert.fail('Unexpected validation failure') } }
  check('create sends trimmed cover URL with remaining fields', () => {
    let payload
    handler('handleCreateCourse','handleEditCourse', {...context, createCourseMutation:{mutate:p=>payload=p}})()
    assert.equal(payload.cover_image_url, form.cover_image_url.trim()); assert.equal(payload.title, form.title)
  })
  check('edit restores saved cover', () => {
    let restored
    handler('handleEditCourse','handleUpdateCourse',{setEditingCourse:()=>{},setCourseForm:p=>restored=p,setFormErrors:()=>{},setShowEditCourseModal:()=>{}})({...form,prerequisites:[],what_youll_learn:[],cover_image_url:'https://cdn.example.org/saved.jpg'})
    assert.equal(restored.cover_image_url,'https://cdn.example.org/saved.jpg')
  })
  for (const url of ['https://images.other-host.test/new.png?token=a%2Fb','', '   ']) {
    check(`update persists cover ${JSON.stringify(url)}`, () => {
      let request
      handler('handleUpdateCourse','handleDeleteCourse',{...context,courseForm:{...form,cover_image_url:url},editingCourse:{course_id:7},updateCourseMutation:{mutate:p=>request=p}})()
      assert.equal(request.data.cover_image_url,url.trim()); assert.equal(request.courseId,7)
      assert.equal(JSON.parse(JSON.stringify(request.data)).cover_image_url,url.trim())
    })
  }
  check('both admin dialogs expose the cover URL field',()=>assert.equal((admin.match(/value=\{courseForm.cover_image_url\}/g)||[]).length,2))
  const source = readFileSync('components/course-cover.tsx','utf8')
  let state = null
  const exports = {}
  vm.runInNewContext(ts.transpile(source,{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}),{exports,require:id=>id==='react'?{useState:()=>[state,value=>{state=value}]}:require(id)})
  const Cover=exports.CourseCover
  check('remote URL renders directly with accessible text',()=> {
    const html=renderToStaticMarkup(React.createElement(Cover,{src:' https://external.test/image.jpg ',title:'Python'}))
    assert.match(html,/src="https:\/\/external.test\/image.jpg"/); assert.match(html,/alt="Python cover"/)
  })
  check('missing covers retain parent fallback',()=>{for(const src of [null,undefined,'','  ']) assert.equal(Cover({src,title:'Python'}),null)})
  check('failed URL hides image and replacement URL can render',()=>{
    const props={src:'https://external.test/broken.jpg',title:'Python'}
    Cover(props).props.onError(); assert.equal(Cover(props),null)
    assert.ok(Cover({...props,src:'https://external.test/replacement.jpg'}))
  })
  for (const path of ['app/courses/page-client.tsx','app/courses/[id]/page-client.tsx']) {
    check(`${path} renders the API cover`,()=>assert.match(readFileSync(path,'utf8'),/<CourseCover src=\{course.cover_image_url\} title=\{course.title\} \/>/))
  }
  return checks
}
if (process.argv[1]?.endsWith('course-cover-contract.mjs')) console.log(`Course cover contract: PASS (${runCoverChecks().length} checks)`)
