const QUOTES = new Set(["'", '"'])

/**
 * Divide um texto em pedaços de nível superior, ignorando separadores
 * dentro de strings, blocos { ... } e parênteses.
 */
export function splitTopLevel(text, separator) {
  const parts = []
  let buffer = ''
  let quote = null
  let braces = 0
  let parens = 0

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const previous = text[index - 1]

    if (quote) {
      buffer += char
      if ((char === quote && previous !== '`') || (char === quote && text[index + 1] === quote)) {
        if (char === quote && text[index + 1] === quote) {
          buffer += text[index + 1]
          index += 1
        } else {
          quote = null
        }
      }
      continue
    }

    if (char === '#' && (index === 0 || /\s/.test(previous))) {
      const lineEnd = text.indexOf('\n', index)
      if (lineEnd === -1) break
      index = lineEnd - 1
      continue
    }

    if (QUOTES.has(char)) {
      quote = char
      buffer += char
      continue
    }
    if (char === '{') {
      braces += 1
      buffer += char
      continue
    }
    if (char === '}') {
      braces = Math.max(0, braces - 1)
      buffer += char
      continue
    }
    if (char === '(') {
      parens += 1
      buffer += char
      continue
    }
    if (char === ')') {
      parens = Math.max(0, parens - 1)
      buffer += char
      continue
    }

    if (char === separator && braces === 0 && parens === 0) {
      parts.push(buffer)
      buffer = ''
      continue
    }

    buffer += char
  }

  parts.push(buffer)
  return parts
}

export function splitStatements(line) {
  return splitTopLevel(line, ';')
    .flatMap((part) => (part.includes('\n') ? part.split('\n') : [part]))
    .map((part) => part.trim())
    .filter(Boolean)
}

export function splitPipeline(statement) {
  return splitTopLevel(statement, '|').map((part) => part.trim())
}

function readQuoted(text, start) {
  const quote = text[start]
  let value = ''
  let index = start + 1
  let closed = false

  while (index < text.length) {
    const char = text[index]
    if (char === quote) {
      if (text[index + 1] === quote) {
        value += quote
        index += 2
        continue
      }
      closed = true
      index += 1
      break
    }
    if (char === '`' && index + 1 < text.length) {
      const next = text[index + 1]
      const escapes = { n: '\n', r: '\r', t: '\t', '0': '\0' }
      value += escapes[next] ?? next
      index += 2
      continue
    }
    value += char
    index += 1
  }

  return { value, index, closed, quote }
}

function readBalanced(text, start, open, close) {
  let depth = 0
  let index = start
  let quote = null

  while (index < text.length) {
    const char = text[index]
    if (quote) {
      if (char === quote && text[index - 1] !== '`') quote = null
      index += 1
      continue
    }
    if (QUOTES.has(char)) {
      quote = char
      index += 1
      continue
    }
    if (char === open) depth += 1
    if (char === close) {
      depth -= 1
      if (depth === 0) return { value: text.slice(start + 1, index), index: index + 1 }
    }
    index += 1
  }

  return { value: text.slice(start + 1), index, closed: false }
}

/**
 * Converte um estágio (sem os pipes) em tokens semânticos.
 */
export function tokenizeStage(stage) {
  const tokens = []
  let index = 0

  while (index < stage.length) {
    const char = stage[index]

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (char === '#') break

    if (QUOTES.has(char)) {
      const quoted = readQuoted(stage, index)
      tokens.push({
        type: 'string',
        value: quoted.value,
        quote: quoted.quote,
        closed: quoted.closed,
        raw: stage.slice(index, quoted.index),
      })
      index = quoted.index
      continue
    }

    if (char === '{') {
      const block = readBalanced(stage, index, '{', '}')
      tokens.push({
        type: 'scriptblock',
        value: block.value.trim(),
        raw: stage.slice(index, block.index),
      })
      index = block.index
      continue
    }

    if (char === '(') {
      const group = readBalanced(stage, index, '(', ')')
      tokens.push({
        type: 'group',
        value: group.value.trim(),
        raw: stage.slice(index, group.index),
      })
      index = group.index
      continue
    }

    if (char === '$') {
      if (stage[index + 1] === '(') {
        const sub = readBalanced(stage, index + 1, '(', ')')
        tokens.push({
          type: 'subexpr',
          value: sub.value.trim(),
          raw: stage.slice(index, sub.index),
        })
        index = sub.index
        continue
      }
      if (stage[index + 1] === '{') {
        const end = stage.indexOf('}', index + 2)
        const name = end === -1 ? stage.slice(index + 1) : stage.slice(index + 2, end)
        tokens.push({ type: 'variable', value: name, raw: stage.slice(index, end === -1 ? stage.length : end + 1) })
        index = end === -1 ? stage.length : end + 1
        continue
      }
      const match = stage.slice(index).match(/^\$([A-Za-z_][\w]*(?::[\w.]+)?(?:\.\w+)*)/)
      if (match) {
        tokens.push({ type: 'variable', value: match[1], raw: match[0] })
        index += match[0].length
        continue
      }
    }

    if (char === '-' && /[A-Za-z?]/.test(stage[index + 1] ?? '')) {
      const match = stage.slice(index).match(/^-([A-Za-z?][\w-]*)(?::([^\s]+))?/)
      if (match) {
        tokens.push({
          type: 'param',
          value: match[1],
          inlineValue: match[2] ?? null,
          raw: match[0],
        })
        index += match[0].length
        continue
      }
    }

    const rest = stage.slice(index)
    const numberMatch = rest.match(/^-?\d+(?:\.\d+)?(?:[KMGT]B)?/i)
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0], raw: numberMatch[0] })
      index += numberMatch[0].length
      continue
    }

    const wordMatch = rest.match(/^[^\s|;{}()]+/)
    if (wordMatch) {
      tokens.push({ type: 'word', value: wordMatch[0], raw: wordMatch[0] })
      index += wordMatch[0].length
      continue
    }

    index += 1
  }

  return tokens
}

export function getPipelineMeta(statement) {
  const stages = splitPipeline(statement)
  return stages.map((stage) => {
    const tokens = tokenizeStage(stage)
    const commandToken = tokens.find((token) => token.type !== 'param') ?? null
    return {
      raw: stage,
      tokens,
      commandName: commandToken?.value ?? '',
      startsWithAssignment: /^\s*\$[\w:{}()]+\s*=/.test(stage),
    }
  })
}

export function trailingFragment(text) {
  const match = text.match(/([^\s]*)$/)
  return match?.[1] ?? ''
}

export function endsWithWhitespace(text) {
  return /\s$/.test(text)
}

export function lastStage(statement) {
  const stages = splitPipeline(statement)
  return stages[stages.length - 1] ?? ''
}

export function stripComment(line) {
  let quote = null
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quote) {
      if (char === quote && line[index - 1] !== '`') quote = null
      continue
    }
    if (QUOTES.has(char)) {
      quote = char
      continue
    }
    if (char === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index).trimEnd()
    }
  }
  return line
}
