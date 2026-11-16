import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const KEYWORDS = new Set([
  'if', 'else', 'elseif', 'foreach', 'for', 'while', 'do', 'switch', 'function', 'filter', 'param',
  'return', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'trap', 'class', 'enum', 'using',
  'in', 'begin', 'process', 'end',
])

const powershell = StreamLanguage.define({
  startState: () => ({ expectCommand: true }),
  token(stream, state) {
    if (stream.sol()) state.expectCommand = true
    if (stream.eatSpace()) return null

    if (stream.peek() === '#') {
      stream.skipToEnd()
      return 'comment'
    }

    if (stream.peek() === '`') {
      stream.next()
      if (!stream.eol()) stream.next()
      return null
    }

    if (stream.peek() === "'" || stream.peek() === '"') {
      const quote = stream.next()
      let escaped = false
      while (!stream.eol()) {
        const char = stream.next()
        if (escaped) {
          escaped = false
          continue
        }
        if (char === '`') {
          escaped = true
          continue
        }
        if (char === quote) break
      }
      state.expectCommand = false
      return 'string'
    }

    if (stream.match(/^\$[{(\w][^;|)\s]*/)) {
      state.expectCommand = false
      return 'variableName'
    }

    if (stream.match(/^-[A-Za-z?][\w-]*/)) {
      state.expectCommand = false
      return 'propertyName'
    }

    if (stream.match(/^-?(eq|ne|gt|ge|lt|le|like|notlike|match|notmatch|contains|notcontains|and|or|not)\b/i)) {
      return 'operator'
    }

    if (stream.match(/^\d+(\.\d+)?(?:[KMGT]B)?/i)) {
      state.expectCommand = false
      return 'number'
    }

    if (stream.peek() === '|' || stream.peek() === ';' || stream.peek() === '{') {
      const char = stream.next()
      state.expectCommand = true
      return char === '{' ? 'bracket' : 'operator'
    }

    if (stream.match(/^[A-Za-z][\w-]*/)) {
      const word = stream.current()
      if (state.expectCommand || /^[A-Za-z]+-[A-Za-z]/.test(word)) {
        state.expectCommand = false
        return 'keyword'
      }
      if (KEYWORDS.has(word.toLowerCase())) return 'keyword'
      return null
    }

    if (stream.match(/^(=~|==|!=|<=|>=|\+=|-=|\*=|\/=|[-+*=<>!])/)) return 'operator'
    if (stream.match(/^[()[\]{},:.]/)) return 'punctuation'

    state.expectCommand = false
    stream.next()
    return null
  },
})

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--syntax-command)', fontWeight: '600' },
  { tag: tags.variableName, color: 'var(--syntax-variable)' },
  { tag: tags.propertyName, color: 'var(--syntax-param)' },
  { tag: tags.string, color: 'var(--syntax-string)' },
  { tag: tags.number, color: 'var(--syntax-number)' },
  { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: tags.operator, color: 'var(--syntax-operator)' },
  { tag: tags.punctuation, color: 'var(--syntax-punctuation)' },
  { tag: tags.bracket, color: 'var(--syntax-punctuation)' },
])

export const powershellLanguage = powershell
export const powershellHighlighting = syntaxHighlighting(highlightStyle)
