# taski

<p align="center">
  <a href="https://github.com/pablopunk/miny"><img src="https://img.shields.io/badge/made_with-miny-1eced8.svg" /> </a>
  <a href="https://www.npmjs.com/package/taski"><img src="https://img.shields.io/npm/dt/taski.svg" /></a>
</p>

<p align="center">
  <i>Simplify your git workflow with tasks</i>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/pablopunk/taski/master/res/taski.svg?sanitize=true" alt="logo" width="300"/>
</p>

<p align="center">
  <a href="https://asciinema.org/a/YArtoa00PICWDPYq1DQXMX4zp" target="_blank"><img src="https://asciinema.org/a/YArtoa00PICWDPYq1DQXMX4zp.svg" /></a>
</p>

## Install

```sh
npm install -g taski
```

## Usage

```bash
$ taski help

  [help]
  Start a task (requires confirmation)
      taski MY_TASK
  List and choose from all tasks:
      taski
  List tasks containing a string. It will create a task if there are no results. The search is "smart case" (it will be case sensitive only if there are any uppercase letters in the search term).
      taski MY
  Delete an existing task called 'foo' (or all containing foo - requires confirmation)
      taski delete foo
  Delete from list
      taski delete

```

## License

MIT

## Author

| ![me](https://gravatar.com/avatar/fa50aeff0ddd6e63273a068b04353d9d?size=100) |
| ---------------------------------------------------------------------------- |
| [Pablo Varela](https://pablo.pink)                                           |
