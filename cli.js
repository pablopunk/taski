#!/usr/bin/env node
const { name: pkgName, version: pkgVersion } = require('./package.json')
const mri = require('mri')
const execa = require('execa')
const inquirer = require('inquirer')
const chalk = require('chalk')

const info = console.log
const remark = msg => console.log(chalk.green(msg))
const error = msg => console.log(chalk.red(msg))

const PROTECT = 'master'

async function getCurrentBranch () {
  return execa('git', ['symbolic-ref', '--short', 'HEAD']).then(res => res.stdout)
}

async function notGit () {
  return execa('git', ['rev-parse', '--is-inside-work-tree'])
    .then(_ => false)
    .catch(_ => true)
}

async function gitNotClean () {
  return execa('git', ['diff', '--exit-code'])
    .then(({ code }) => code !== 0)
    .catch(_ => true)
}

async function branchExists (name) {
  return execa('git', ['show-ref', '--verify', '--quiet', `refs/heads/${name}`])
    .then(_ => true)
    .catch(_ => false)
}

async function deleteTask (name) {
  if (name === PROTECT) {
    error(`Branch ${name} is protected`)
    return
  }
  return execa('git', ['branch', '-d', name]).catch(err => {
    throw new Error(`Something went wrong deleting the branch\n${err.message}`)
  })
}

async function startTask (name, isNew = false) {
  const args = isNew ? ['checkout', '-b', name] : ['checkout', name]

  return execa('git', args).catch(err => {
    throw new Error(`Something went wrong creating the branch\n${err.message}`)
  })
}

async function getBranchList (fuzzy = '') {
  const { stdout } = await execa('git', ['branch', '-a'])
  const branches = stdout
    .split('\n') // each line is a branch
    .map(b => b.replace(/^../, '')) // two first characters are not int the name
    .filter(b => !b.startsWith('remotes/')) // remove remotes
    .filter(b => !!b) // remove '' when there are no branches
    .filter(b => b.includes(fuzzy)) // fuzzy search

  return branches
}

async function triggerTaskStart (name) {
  const doesBranchExist = await branchExists(name)
  startTask(name, !doesBranchExist)
  remark(
    doesBranchExist
      ? `Branch exists, checking out now...`
      : `Created task ${name}`
  )
}

function help () {
  info(`
  [help]
  Start a task:
      ${pkgName} MY_TASK
  List and choose from all tasks:
      ${pkgName}
  List tasks containing a string or start task if it's the only one
      ${pkgName} MY
  `)
}

async function cli (argv) {
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
          `Please commit any changes in your repo before using this tool`
        )
      }

      const branches = await getBranchList(commands[0])

      if (commands[0] === 'delete') {
        if (commands[1]) { // delete specific
          const currentBranch = await getCurrentBranch()
          if (await branchExists(commands[1])) {
            if (currentBranch === commands[1]) {
              throw new Error(`Can't delete branch ${currentBranch} if you're on it`)
            }
            deleteTask(commands[1])
            remark(`Deleted branch ${commands[1]}`)
          } else { // search parameter and delete all matches
            const matches = await getBranchList(commands[1])
            if (matches.length === 0) {
              throw new Error(`No results for search: '${commands[1]}'`)
            }
            if (matches.includes(currentBranch)) {
              throw new Error(`Can't delete branch ${currentBranch} if you're on it`)
            }
            info('Will be deleting the following branches:')
            remark(matches.join('\n'))
            inquirer // ask for confirmation
              .prompt({
                name: 'Are you sure?',
                type: 'list',
                choices: [ 'y', 'n' ]
              })
              .then(({ 'Are you sure?': answer }) => {
                if (answer === 'y') {
                  matches.forEach(deleteTask)
                  remark(`Deleted`)
                }
              })
          }
        } else { // show list to choose
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

      if (await branchExists(commands[0])) {
        triggerTaskStart(commands[0])
        break
      }

      // No branches, start one with provided name
      if (branches.length === 0) {
        triggerTaskStart(commands[0])
        break
      }

      // 1 branch with current search, start it
      if (commands[0] && branches.length === 1) {
        triggerTaskStart(branches[0])
        break
      }

      inquirer
        .prompt({
          name: 'Choose task',
          type: 'list',
          choices: [...branches, new inquirer.Separator(), 'Create new task']
        })
        .then(({ 'Choose task': answer }) => {
          if (answer === 'Create new task') {
            info(`Create new task with '${pkgName} start <task-name>'`)
          } else {
            triggerTaskStart(answer)
          }
        })
      break
  }
}

cli(process.argv.slice(2)).catch(err => error(err.message))
