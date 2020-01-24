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

String.prototype.fuzzy = function(term) {
  if (term.hasUpperCase()) {
    // case sensitive search
    return new RegExp(term).test(this)
  }

  // case insensitive search
  return new RegExp(term, 'i').test(this)
}

String.prototype.hasUpperCase = function() {
  return /[A-Z]/.test(this)
}
