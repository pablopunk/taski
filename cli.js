#!/usr/bin/env node
const { name: pkgName, version: pkgVersion } = require('./package.json')
const mri = require('mri')
const execa = require('execa')
const inquirer = require('inquirer')
const kleur = require('kleur')

const info = console.log
const remark = msg => console.log(kleur.green(msg))
const error = msg => console.log(kleur.red(msg))

const PROTECT = 'master'

/* eslint-disable no-extend-native */
Array.prototype.unique = function() {
  return this.reduce((acc, curr) => {
    const exists = acc.includes(curr)
    if (!exists) {
      acc.push(curr)
    }
    return acc
  }, [])
}

Array.prototype.equals = function(anotherArray) {
  return JSON.stringify(this) === JSON.stringify(anotherArray)
}

async function getCurrentBranch() {
  return execa('git', ['symbolic-ref', '--short', 'HEAD']).then(
    res => res.stdout
  )
}

async function notGit() {
  return execa('git', ['rev-parse', '--is-inside-work-tree'])
    .then(_ => false)
    .catch(_ => true)
}

async function gitNotClean() {
  return execa('git', ['diff', '--exit-code'])
    .then(({ code }) => code !== 0)
    .catch(_ => true)
}

async function branchExists(branchListOptions) {
  return getBranchList(branchListOptions).then(branches => branches.length > 0)
}

async function deleteTask(name) {
  if (name === PROTECT) {
    error(`Branch ${name} is protected`)
    return
  }
  return execa('git', ['branch', '-D', name]).catch(err => {
    throw new Error(`Something went wrong deleting the branch\n${err.message}`)
  })
}

async function startTask(name, isNew = false) {
  let trackArgs = []
  const remotes = await getRemotesList()
  if (!isNew) {
    for (const remote of remotes) {
      const possibleBranch = `remotes/${remote}/${name}`

      if (await branchExists({ exact: possibleBranch, fullName: true })) {
        trackArgs = ['--track', possibleBranch.replace('remotes/', '')]
        break
      }
    }
  }

  const args = isNew
    ? ['checkout', '-b', name]
    : ['checkout', ...trackArgs, '-B', name]

  return execa('git', args).catch(err => {
    throw new Error(`Something went wrong creating the branch\n${err.message}`)
  })
}

async function getBranchList({
  fuzzy = '',
  exact = '',
  fullName = false
} = {}) {
  const { stdout } = await execa('git', ['branch', '-a'])
  const branches = stdout
    .split('\n') // each line is a branch
    .filter(b => b.includes(fuzzy)) // fuzzy search
    .map(b => b.replace(/^../, '')) // two first characters are not in the name
    .map(b => (!fullName && b.startsWith('remote') ? b.split('/').pop() : b))
    .reduce((acc, curr) => {
      // remove duplicates (caused by previous map)
      if (acc.includes(curr)) {
        return acc
      }
      return [...acc, curr]
    }, [])
    .filter(b => exact === '' || b === exact)
    .filter(Boolean) // remove '' when there are no branches

  return branches
}

async function getRemotesList() {
  const { stdout } = await execa('git', ['remote', '-v'])
  const remotes = stdout.split('\n').map(r => r.split('\t')[0])

  return ['origin', ...remotes].unique()
}

const invalidSubstrings = [
  '..',
  ' ',
  '~',
  '^',
  ':',
  '?',
  '*',
  '[',
  '//',
  '@{',
  '\\'
]

const cantEndWithSubstrings = ['.', '/']

const cantStartWithSubstrings = ['/']

function isNameValid(name) {
  for (const notAllowed of invalidSubstrings) {
    if (name.includes(notAllowed)) {
      return false
    }
  }
  for (const notAllowed of cantEndWithSubstrings) {
    if (name[name.length - 1] === notAllowed) {
      return false
    }
  }
  for (const notAllowed of cantStartWithSubstrings) {
    if (name.startsWith(notAllowed)) {
      return false
    }
  }
  return true
}

async function triggerTaskStart(name) {
  const doesBranchExist = await branchExists({ exact: name })
  if (!isNameValid(name)) {
    error('Invalid name')
    return
  }
  await startTask(name, !doesBranchExist)
  remark(
    doesBranchExist
      ? 'Branch exists, checking out now...'
      : `Created task ${name}`
  )
}

function help() {
  info(`
  [help]
  Start a task (requires confirmation)
      ${pkgName} MY_TASK
  List and choose from all tasks
      ${pkgName}
  List tasks containing a string (starts task if no results)
      ${pkgName} MY
  Delete an existing task called 'foo' (or all containing foo - requires confirmation)
      ${pkgName} delete foo
  Delete from list
      ${pkgName} delete
  `)
}

async function cli(argv) {
  const { _: commands } = mri(argv)

  switch (commands[0]) {
    case 'version':
    case 'v':
      info(pkgVersion)
      break
    case 'help':
    case 'h':
      help()
      break
    default:
      if (await notGit()) {
        throw new Error('This is not a git repo')
      }

      if (await gitNotClean()) {
        throw new Error(
          'Please commit any changes in your repo before using this tool'
        )
      }

      /* eslint-disable-next-line no-case-declarations */
      const branches = await getBranchList({ fuzzy: commands[0] })

      if (commands[0] === 'delete') {
        if (commands[1]) {
          // delete specific
          const currentBranch = await getCurrentBranch()
          if (await branchExists({ exact: commands[1] })) {
            if (currentBranch === commands[1]) {
              throw new Error(
                `Can't delete branch ${currentBranch} if you're on it`
              )
            }
            deleteTask(commands[1])
            remark(`Deleted branch ${commands[1]}`)
          } else {
            // search parameter and delete all matches
            const matches = await getBranchList({ fuzzy: commands[1] })
            if (matches.length === 0) {
              throw new Error(`No results for search: '${commands[1]}'`)
            }
            if (matches.includes(currentBranch)) {
              throw new Error(
                `Can't delete branch ${currentBranch} if you're on it`
              )
            }
            info('Will be deleting the following branches:')
            remark(matches.join('\n'))
            inquirer // ask for confirmation
              .prompt({
                name: 'Are you sure?',
                type: 'list',
                choices: ['y', 'n']
              })
              .then(({ 'Are you sure?': answer }) => {
                if (answer === 'y') {
                  matches.forEach(deleteTask)
                  remark('Deleted')
                }
              })
          }
        } else {
          // show list to choose
          const allBranches = await getBranchList()

          inquirer // ask for confirmation
            .prompt({
              name: 'Choose branch to delete',
              type: 'list',
              choices: allBranches
            })
            .then(({ 'Choose branch to delete': answer }) => {
              deleteTask(answer)
            })
        }

        break
      }

      if (await branchExists({ exact: commands[0] })) {
        triggerTaskStart(commands[0])
        break
      }

      // No branches, ask user to start a new one
      if (branches.length === 0) {
        const question = `Create task '${commands[0]}'?`
        const { [question]: answer } = await inquirer.prompt({
          name: question,
          type: 'list',
          choices: ['y', 'n']
        })
        if (answer === 'y') {
          triggerTaskStart(commands[0])
        }
        break // never continue
      }

      // Choosing an existing branch
      inquirer
        .prompt({
          name: 'Choose task',
          type: 'list',
          choices: [...branches, new inquirer.Separator(), 'Create new task']
        })
        .then(({ 'Choose task': answer }) => {
          if (answer === 'Create new task') {
            info(`Create new task with '${pkgName} <task-name>'`)
          } else {
            triggerTaskStart(answer)
          }
        })
      break
  }
}

cli(process.argv.slice(2)).catch(err => error(err.message))
