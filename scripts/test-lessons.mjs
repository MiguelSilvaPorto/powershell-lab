import { createInitialWorld } from '../src/data/seed.js'
import { executeLine } from '../src/engine/simulator.js'
import { LESSONS } from '../src/data/lessons.js'

let errors = 0
const ids = new Set()
for (const lesson of LESSONS) {
  if (ids.has(lesson.id)) { console.log('DUPLICATE LESSON', lesson.id); errors++ }
  ids.add(lesson.id)
  const world = createInitialWorld()
  let taskIndex = 0
  for (const taskItem of lesson.tasks) {
    taskIndex++
    if (ids.has(taskItem.id)) { console.log('DUPLICATE TASK', taskItem.id); errors++ }
    ids.add(taskItem.id)
    let regex
    try { regex = new RegExp(taskItem.pattern, 'i') } catch (error) { console.log('BAD REGEX', lesson.id, taskItem.id, error.message); errors++; continue }
    const matches = regex.test(taskItem.solution)
    if (!matches) { console.log('PATTERN DOES NOT MATCH SOLUTION:', lesson.id, taskItem.id, '|', taskItem.pattern, '|', taskItem.solution); errors++ }
    const result = executeLine(taskItem.solution, world)
    if (!result.ok && !taskItem.allowFailure) { console.log('SOLUTION FAILED:', lesson.id, taskItem.id, '|', taskItem.solution, '|', result.errors.map(e => e.message).join(' / ')); errors++ }
    if (taskItem.verify && !taskItem.verify(world)) { console.log('VERIFY FAILED:', lesson.id, taskItem.id); errors++ }
  }
}
console.log(`Lessons: ${LESSONS.length} | Tasks: ${ids.size} | Errors: ${errors}`)
