const test = require('myass')
const { shellSync: exe } = require('execa')

const createRepo = _ => exe(`
  rm -rf tmp &&
  mkdir tmp &&
  cd tmp && git init &&
  git config user.email "my@email.com" &&
  git config user.name "My Name" &&
  echo test >> test && git add test &&
  git commit -m test
`)

const executeInRepo = args => exe(`
  cd tmp &&
  node .. ${args}
`)

const getBranchName = _ => exe(`
  cd tmp &&
  git symbolic-ref --short HEAD
`).stdout

test('Starts a task as a new branch', t => {
  const randomName = parseInt((Math.random() * 1000)).toString()
  createRepo()
  executeInRepo(randomName)
  t.is(getBranchName(), randomName)
})

test('Checkout branch if it exists', t => {
  createRepo()
  executeInRepo('FOO')
  exe(`cd tmp && git checkout master`)
  executeInRepo('FOO')
  t.is(getBranchName(), 'FOO')
})

test('Checkout branch if it\'s the only match', async t => {
  createRepo()
  executeInRepo('FOO')
  exe(`cd tmp && git checkout master`)
  executeInRepo('FO')
  t.is(getBranchName(), 'FOO')
})
