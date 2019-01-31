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

const listBranches = _ => exe(`
  cd tmp &&
  git branch -a
`).stdout.split('\n').map(b => b.replace(/^../, ''))

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

test('Throws error if git is not clean', async t => {
  createRepo()
  exe(`cd tmp && rm test`)
  const { stdout } = executeInRepo('FOO')
  t.is(stdout, 'Please commit any changes in your repo before using this tool')
})

test('Throws error outside of repo', async t => {
  const { stdout } = exe(`
    rm -rf /tmp/taski-no-repo &&
    mkdir /tmp/taski-no-repo &&
    cd /tmp/taski-no-repo && node ${__dirname}`)
  t.is(stdout, 'This is not a git repo')
})

test('Can delete branch', async t => {
  createRepo()
  executeInRepo('FOO')
  executeInRepo('master')
  executeInRepo('delete FOO')
  const branches = listBranches()
  t.is(branches, ['master'])
})

test('Branch master is protected', async t => {
  createRepo()
  executeInRepo('FOO')
  executeInRepo('delete master')
  const branches = listBranches()
  t.is(branches, ['FOO', 'master'])
})

test('No results for non-existent branch', async t => {
  createRepo()
  const { stdout } = executeInRepo('delete FOO')
  t.is(stdout, 'No results for search: \'FOO\'')
})

// from `man git check-ref-format`
const invalidNames = [
  'two..dots',
  'spaces spaces',
  'this~',
  'this^',
  'this:',
  'this?',
  'this*',
  'this[',
  'two//slashes',
  'this@{',
  'this\\\\',
  'endwithdot.',
  'endwithslash/',
  '/start'
]

test('Throws error for invalid branch names', async t => {
  createRepo()
  for (let invalid of invalidNames) {
    const { stdout } = executeInRepo(`"${invalid}"`)
    t.is(stdout, 'Invalid name')
  }
})
