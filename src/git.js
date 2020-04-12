const execa = require('execa')

async function getCurrentBranch() {
  return execa('git', ['symbolic-ref', '--short', 'HEAD']).then(
    (res) => res.stdout
  )
}

async function notGit() {
  return execa('git', ['rev-parse', '--is-inside-work-tree'])
    .then((_) => false)
    .catch((_) => true)
}

async function gitNotClean() {
  return execa('git', ['cherry', '-v'])
    .then(({ stdout }) => {
      return stdout.length !== 0 // clean stdout means git is clean
    })
    .then((notClean) => {
      if (notClean) {
        return true
      }

      return execa('git', ['diff', '--exit-code'])
        .then(({ code }) => code !== 0)
        .catch((_) => true)
    })
}

async function branchExists(branchListOptions) {
  return getBranchList(branchListOptions).then(
    (branches) => branches.length > 0
  )
}

function normalizeBranchesFromOutput(stdout, { fuzzy, fullName, exact }) {
  return stdout
    .split('\n') // each line is a branch
    .map((b) => b.replace(/^../, '')) // two first characters are not in the name
    .map((b) =>
      !fullName && b.startsWith('remote')
        ? b.replace(/remotes\/[^\/]*\//, '')
        : b
    )
    .filter((b) => (fuzzy == null ? true : b.fuzzy(fuzzy))) // fuzzy search
    .filter((b) => !b.includes('HEAD -> ')) // remove HEAD
    .reduce((acc, curr) => {
      // remove duplicates (caused by previous map)
      if (acc.includes(curr)) {
        return acc
      }
      return [...acc, curr]
    }, [])
    .filter(Boolean) // remove '' when there are no branches
    .filter((b) => (exact == null ? true : b === exact))
}

async function getBranchList({
  fuzzy = null,
  exact = null,
  fullName = false,
} = {}) {
  const { stdout } = await execa('git', ['branch', '-a'])
  const branches = normalizeBranchesFromOutput(stdout, {
    fuzzy,
    exact,
    fullName,
  })

  return branches
}

async function getRemotesList() {
  const { stdout } = await execa('git', ['remote', '-v'])
  const remotes = stdout.split('\n').map((r) => r.split('\t')[0])

  return ['origin', ...remotes].unique()
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

  return execa('git', args).catch((err) => {
    throw new Error(`Something went wrong creating the branch\n${err.message}`)
  })
}

module.exports = {
  branchExists,
  getBranchList,
  getCurrentBranch,
  gitNotClean,
  notGit,
  startTask,
  normalizeBranchesFromOutput,
}
