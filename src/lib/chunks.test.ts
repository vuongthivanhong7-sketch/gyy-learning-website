import { describe, expect, it } from 'vitest'
import { chunkSentence } from './chunks'

describe('chunkSentence', () => {
  it('keeps the idiom intact and the chunks rebuild the sentence', () => {
    const zh = '他性格开朗，喜欢和不同行业的人打交道。'
    const c = chunkSentence(zh, '打交道')!
    expect(c.join('')).toBe(zh)
    expect(c).toContain('打交道。')
    expect(c.length).toBeGreaterThanOrEqual(3)
    expect(c.length).toBeLessThanOrEqual(8)
  })
  it('returns null for very short sentences', () => {
    expect(chunkSentence('吃醋', '吃醋')).toBeNull()
  })
})
