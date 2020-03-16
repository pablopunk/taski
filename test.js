const test = require('myass')
const { isNameValid } = require('./src/utils')
const { normalizeBranchesFromOutput } = require('./src/git')

test('Valid/Invalid names', async t => {
  t.true(isNameValid('foo'))
  t.true(isNameValid('foo.bar'))
  t.false(isNameValid('foo..bar'))
  t.false(isNameValid('foo bar'))
  t.false(isNameValid('foo~bar'))
  t.false(isNameValid('foo^bar'))
  t.false(isNameValid('foo*bar'))
  t.false(isNameValid('foo[bar'))
  t.false(isNameValid('foo//bar'))
  t.false(isNameValid('foo@{bar'))
  t.false(isNameValid('foo\\bar'))
  t.true(isNameValid('.foo'))
  t.false(isNameValid('foo.'))
  t.false(isNameValid('foo/'))
  t.false(isNameValid('/foo'))
})

test('Names don\'t include "remote/"', async t => {
  const stdout = `
* master
  remotes/origin/HEAD -> origin/master
  remotes/origin/master
  `
  const branches = normalizeBranchesFromOutput(stdout, {})
  t.is(branches, ['master'])
})

test('You can have names like release/2.0', async t => {
  const stdout = `
* master
  remotes/origin/HEAD -> origin/master
  remotes/origin/master
  remotes/upstream/release/2.0
  `
  const branches = normalizeBranchesFromOutput(stdout, {})
  t.is(branches, ['master', 'release/2.0'])
})
