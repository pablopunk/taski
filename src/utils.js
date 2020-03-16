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

module.exports = {
  isNameValid
}
