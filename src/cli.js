#!/usr/bin/env node
const { name: pkgName, version: pkgVersion } = require('../package.json')
const mri = require('mri')
const execa = require('execa')
const inquirer = require('inquirer')
const kleur = require('kleur')

require('./overrides')
const {
  branchExists,
  getBranchList,
  getCurrentBranch,
  gitNotClean,
  notGit,
  startTask
} = require('./git')
const { isNameValid } = require('./utils.js')

const info = console.log
const remark = msg => console.log(kleur.green(msg))
const logred = msg => console.log(kleur.red(msg))
const error = err => {
  let msg = err

  if (typeof err === 'object' && typeof err.message === 'string') {
    msg = err.message
  }

  console.log(kleur.red(msg))
}

const PROTECT = 'master'

async function deleteTask(name) {
  if (name === PROTECT) {
    error(`Branch ${name} is protected`)
    return
  }
  return execa('git', ['branch', '-D', name]).catch(err => {
    throw new Error(`Something went wrong deleting the branch\n${err.message}`)
  })
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
  List tasks containing a string. It will create a task if there are no results. The search is "smart case" (it will be case sensitive only if there are any uppercase letters in the search term).
      ${pkgName} MY
  Delete an existing task called 'foo' (or all containing foo - requires confirmation)
      ${pkgName} delete foo
  Delete from list
      ${pkgName} delete
  `)
}

async function triggerTaskDelete(commands) {
  if (commands[1]) {
    // delete specific
    const currentBranch = await getCurrentBranch()
    if (await branchExists({ exact: commands[1] })) {
      if (currentBranch === commands[1]) {
        throw new Error(`Can't delete branch ${currentBranch} if you're on it`)
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
        throw new Error(`Can't delete branch ${currentBranch} if you're on it`)
      }
      info('Will be deleting the following branches:')
      logred(matches.join('\n'))
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
}

async function askUserToStartTask(commands) {
  const question = `Create task '${commands[0]}'?`
  const { [question]: answer } = await inquirer.prompt({
    name: question,
    type: 'list',
    choices: ['y', 'n']
  })
  if (answer === 'y') {
    triggerTaskStart(commands[0])
  }
}

async function chooseAnExsistingBranch(branches, commands) {
  inquirer
    .prompt({
      name: 'Choose task',
      type: 'list',
      choices: [...branches, new inquirer.Separator(), 'Create new task']
    })
    .then(({ 'Choose task': answer }) => {
      if (answer === 'Create new task') {
        triggerTaskStart(commands[0])
      } else {
        triggerTaskStart(answer)
      }
    })
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
        triggerTaskDelete(commands).catch(error)
        break
      }

      if (commands[0] && (await branchExists({ exact: commands[0] }))) {
        triggerTaskStart(commands[0])
        break
      }

      if (branches.length === 0) {
        askUserToStartTask(commands)
        break // never continue
      }

      chooseAnExsistingBranch(branches, commands)

      break
  }
}

cli(process.argv.slice(2)).catch(error)
