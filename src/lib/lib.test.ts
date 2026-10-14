import { describe, expect, it } from 'vitest'
import { matchesTyped, normalizePinyin, normalizeVi } from './text'
import { rate, newSrs, isDue } from './srs'
import { computeStreak, weekStart, vnDay } from './date'

describe('text', () => {
  it('normalizes pinyin', () => {
    expect(normalizePinyin('chī bù xiāo')).toBe('chibuxiao')
    expect(normalizePinyin('Chi Bu Xiao')).toBe('chibuxiao')
    expect(normalizePinyin('chi1 bu4 xiao1')).toBe('chibuxiao')
  })
  it('matches typed answers', () => {
    expect(matchesTyped('chi bu xiao', '吃不消', 'chī bù xiāo')).toBe(true)
    expect(matchesTyped('吃不消', '吃不消', 'chī bù xiāo')).toBe(true)
    expect(matchesTyped('吃不起', '吃不消', 'chī bù xiāo')).toBe(false)
    expect(matchesTyped('', '吃不消', 'chī bù xiāo')).toBe(false)
  })
  it('strips Vietnamese diacritics', () => {
    expect(normalizeVi('Không chịu nổi Đời')).toBe('khong chiu noi doi')
  })
})

describe('srs', () => {
  const now = new Date('2026-10-10T00:00:00Z')
  it('uses starting intervals on first review', () => {
    expect(rate(undefined, 'again', now).intervalMin).toBe(1)
    expect(rate(undefined, 'hard', now).intervalMin).toBe(360)
    expect(rate(undefined, 'good', now).intervalMin).toBe(1440)
    expect(rate(undefined, 'easy', now).intervalMin).toBe(4320)
  })
  it('grows with repeated good ratings', () => {
    const a = rate(undefined, 'good', now)
    const b = rate(a, 'good', now)
    expect(b.intervalMin).toBeGreaterThan(a.intervalMin)
    expect(b.reps).toBe(2)
  })
  it('resets on again and counts lapses', () => {
    const a = rate(rate(undefined, 'good', now), 'again', now)
    expect(a.intervalMin).toBe(1)
    expect(a.lapses).toBe(1)
    expect(a.reps).toBe(0)
  })
  it('is due when dueAt passed', () => {
    expect(isDue(newSrs(now), new Date(now.getTime() + 1))).toBe(true)
    expect(isDue(rate(undefined, 'good', now), now)).toBe(false)
  })
})

describe('streak', () => {
  it('counts consecutive days and keeps alive through yesterday', () => {
    const days = new Set(['2026-10-07', '2026-10-08', '2026-10-09'])
    expect(computeStreak(days, '2026-10-10')).toEqual({ current: 3, longest: 3 })
    expect(computeStreak(days, '2026-10-11').current).toBe(0)
  })
  it('tracks longest separately', () => {
    const days = new Set(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-09', '2026-10-10'])
    expect(computeStreak(days, '2026-10-10')).toEqual({ current: 2, longest: 3 })
  })
  it('week starts on Monday', () => {
    expect(weekStart('2026-10-10')).toBe('2026-10-05')
    expect(weekStart('2026-10-05')).toBe('2026-10-05')
  })
  it('uses Vietnam day boundary', () => {
    expect(vnDay('2026-10-09T18:00:00Z')).toBe('2026-10-10')
  })
})


import { evaluate, termKey } from './verify'
import type { VerifyEntry } from './verify'
const mk = (rs: VerifyEntry['results']): VerifyEntry => ({ term: '打交道', results: rs })
describe('verification rules', () => {
  it('no data when nothing recorded', () => { expect(evaluate(undefined).state).toBe('no_data'); expect(evaluate(mk([{ sourceId: 'a', status: 'not_checked' }])).state).toBe('no_data') })
  it('verified when at least one source confirms 惯用语, even if another labels it 成语', () => {
    const e = evaluate(mk([{ sourceId: 'a', status: 'confirmed', labels: ['惯用语'] }, { sourceId: 'b', status: 'found_other_label', labels: ['成语'] }]))
    expect(e.state).toBe('verified'); expect(e.confirmedBy).toEqual(['a']); expect(e.otherLabels).toEqual(['成语'])
  })
  it('only other labels -> undetermined, not an absolute "no"', () => { expect(evaluate(mk([{ sourceId: 'b', status: 'found_other_label', labels: ['谚语'] }])).state).toBe('undetermined') })
  it('preliminary evidence stays preliminary', () => { expect(evaluate(mk([{ sourceId: 'a', status: 'preliminary' }])).state).toBe('preliminary') })
  it('not found in checked sources', () => { expect(evaluate(mk([{ sourceId: 'a', status: 'not_found' }])).state).toBe('not_found') })
  it('confirmed wins over not_found elsewhere', () => { expect(evaluate(mk([{ sourceId: 'a', status: 'not_found' }, { sourceId: 'b', status: 'confirmed', labels: ['惯用语'] }])).state).toBe('verified') })
  it('term key keeps only Han characters', () => { expect(termKey(' 打 交道！')).toBe('打交道') })
})

import { computeTasks, taskPercent } from './tasks'
import { buildHeatmap, levelOf } from './heatmap'
import { emptyUserState } from '../types'
describe('tasks and heatmap', () => {
  const today = '2026-10-10'
  const at = (h: number) => `2026-10-10T${String(h).padStart(2, '0')}:00:00+07:00`
  it('new account: nothing done, review task idle, 0%', () => {
    const t = computeTasks(emptyUserState(), 0, today)
    expect(t.find((x) => x.id === 'review')!.idle).toBe(true)
    expect(t.every((x) => !x.done)).toBe(true)
    expect(taskPercent(t)).toBe(0)
  })
  it('progress comes only from real activity today', () => {
    const s = emptyUserState()
    s.prefs.dailyNew = 2
    s.activity = [
      { ts: at(8), kind: 'learn', points: 10 }, { ts: at(9), kind: 'learn', points: 10 },
      { ts: '2026-10-09T08:00:00+07:00', kind: 'learn', points: 10 },
    ]
    const t = computeTasks(s, 3, today)
    expect(t.find((x) => x.id === 'learn')).toMatchObject({ progress: 2, target: 2, done: true })
    expect(t.find((x) => x.id === 'review')).toMatchObject({ target: 3, progress: 0, done: false })
  })
  it('claims are per day and per task', () => {
    const s = emptyUserState(); s.claims = { [today]: ['learn'], '2026-10-09': ['practice'] }
    const t = computeTasks(s, 0, today)
    expect(t.find((x) => x.id === 'learn')!.claimed).toBe(true)
    expect(t.find((x) => x.id === 'practice')!.claimed).toBe(false)
  })
  it('heatmap ignores bonus and empty days, uses VN day', () => {
    const acts = [{ ts: at(0), kind: 'learn' as const, points: 10 }, { ts: at(10), kind: 'bonus' as const, points: 10 }]
    const { cells, summary } = buildHeatmap(acts, [], 90, today)
    expect(cells).toHaveLength(90)
    expect(cells[89]).toMatchObject({ day: today, learned: 1, total: 1, level: 1, xp: 20 })
    expect(summary.daysStudied).toBe(1)
    expect(cells.filter((c) => c.total > 0)).toHaveLength(1)
  })
  it('levels', () => { expect([0, 1, 2, 4, 7].map(levelOf)).toEqual([0, 1, 2, 3, 4]) })
})

import { classifyVoice } from './speech'
import { readFileSync } from 'node:fs'
describe('voices and official corpus', () => {
  it('classifies only clearly named voices', () => {
    expect(classifyVoice('Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)')).toBe('female')
    expect(classifyVoice('Microsoft Yunxi Online (Natural) - Chinese (Mainland)')).toBe('male')
    expect(classifyVoice('Microsoft Kangkang - Chinese (Simplified, PRC)')).toBe('male')
    expect(classifyVoice('Google 普通话（中国大陆）')).toBe('unknown')
    expect(classifyVoice('Female voice')).toBe('female')
  })
  it('keeps all 99 official idioms with unique ids and Hán characters', () => {
    const d = JSON.parse(readFileSync('public/data/idioms.json', 'utf8')).idioms as { id: string; hanzi: string; meaningVi: string; occurrences?: unknown[] }[]
    expect(d).toHaveLength(99)
    expect(new Set(d.map((i) => i.id)).size).toBe(99)
    expect(new Set(d.map((i) => i.hanzi)).size).toBe(99)
    expect(d.every((i) => i.meaningVi && i.occurrences && i.occurrences.length > 0)).toBe(true)
  })
})

import { pinyinMarks, splitSenses, isIdiomTagged } from './extdict'
import { classify } from './classify'
import { evaluate as evalVerify } from './verify'
describe('extended dictionary', () => {
  it('converts numeric pinyin to tone marks', () => {
    expect(pinyinMarks('xue2 xiao4')).toBe('xué xiào')
    expect(pinyinMarks('lu:4 deng1')).toBe('lǜ dēng')
    expect(pinyinMarks('liu2 mei3 ma5')).toBe('liú měi ma')
    expect(pinyinMarks('zuan1 kong4 zi5')).toBe('zuān kòng zi')
    expect(pinyinMarks('hou4 dui4')).toBe('hòu duì')
  })
  it('classifies only with evidence (A / B / C)', () => {
    const none = evalVerify(undefined)
    expect(classify(none, []).state).toBe('C')
    expect(classify(none, [{ s: '画蛇添足', p: 'hua4', d: ['lit. draw legs on a snake (idiom); fig. to overdo it'] }]).state).toBe('B')
    const verified = evalVerify({ term: 'x', results: [{ sourceId: 'a', status: 'confirmed', labels: ['惯用语'] }] })
    expect(classify(verified, []).state).toBe('A')
    const other = evalVerify({ term: 'x', results: [{ sourceId: 'b', status: 'found_other_label', labels: ['谚语'] }] })
    expect(classify(other, []).state).toBe('B')
    // đã có xác nhận 惯用语 thì vẫn là A dù CC-CEDICT gắn idiom
    expect(classify(verified, [{ s: 'x', p: '', d: ['(idiom) y'] }]).state).toBe('A')
  })
  it('does not treat the idiom tag as 惯用语 and splits lit./fig. senses by the source markers', () => {
    expect(isIdiomTagged([{ s: 'a', p: '', d: ['school'] }])).toBe(false)
    const s = splitSenses(['lit. draw legs on a snake (idiom); fig. to ruin the effect', 'to overdo it', '(fig.) night owl'])
    expect(s.literal).toHaveLength(1); expect(s.figurative).toHaveLength(1); expect(s.other).toEqual(['to overdo it'])
  })
  it('built dictionary data answers the sample terms', async () => {
    const { readFileSync, existsSync } = await import('node:fs')
    const get = (w: string) => { const f = `public/data/dict/b${Math.floor(w.codePointAt(0)! / 32).toString(16)}.json`; return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as [string, string, string[]][]).filter((r) => r[0] === w) : [] }
    for (const w of ['钻空子', '夜猫子', '开绿灯', '马马虎虎', '画蛇添足', '学校', '认真', '帮忙']) expect(get(w).length, w).toBeGreaterThan(0)
    expect(get('画蛇添足').some((r) => r[2].some((d) => d.includes('(idiom)')))).toBe(true)
    expect(get('学校').some((r) => r[2].some((d) => d.includes('(idiom)')))).toBe(false)
    expect(get('这不是一个真正的词')).toHaveLength(0)
  })
})

describe('official 99 idioms are preserved', () => {
  const load = () => JSON.parse(readFileSync('public/data/idioms.json', 'utf8')).idioms as { id: string; hanzi: string; pinyin: string; meaningVi: string; examples: unknown[]; occurrences: { source: string }[]; topics?: string[] }[]
  const manifest = JSON.parse(readFileSync('tests/idiom-manifest.json', 'utf8')) as { count: number; items: { id: string; hanzi: string; sources: string[] }[] }
  it('none of the manifest items is missing, renamed or re-sourced', () => {
    const byId = new Map(load().map((i) => [i.id, i]))
    expect(manifest.items).toHaveLength(99)
    for (const m of manifest.items) {
      const cur = byId.get(m.id)
      expect(cur, `thiếu mục ${m.hanzi} (${m.id})`).toBeDefined()
      expect(cur!.hanzi).toBe(m.hanzi)
      expect([...new Set(cur!.occurrences.map((o) => o.source))].sort()).toEqual(m.sources)
    }
  })
  it('every item has the required fields and a topic', () => {
    const topics = JSON.parse(readFileSync('public/data/overrides.json', 'utf8')).topics as Record<string, string[]>
    for (const i of load()) {
      expect(i.id && i.hanzi && i.pinyin && i.meaningVi, i.hanzi).toBeTruthy()
      expect(i.occurrences.length, i.hanzi).toBeGreaterThan(0)
      expect((topics[i.id] ?? i.topics ?? []).length, `${i.hanzi} chưa có chủ đề`).toBeGreaterThan(0)
    }
  })
  it('dictionary and OCR data never remove an idiom: ids stay unique', () => { const ids = load().map((i) => i.id); expect(new Set(ids).size).toBe(ids.length) })
})

import { orderPuzzle } from './chunks'
describe('sentence ordering uses stored answers only', () => {
  const all = JSON.parse(readFileSync('public/data/idioms.json', 'utf8')).idioms as { id: string; hanzi: string; pinyin: string; meaningVi: string; examples: { zh: string }[] }[]
  it('every puzzle reassembles exactly to its stored example and keeps the idiom whole', () => {
    let n = 0
    for (const i of all) {
      const p = orderPuzzle(i as never)
      if (!p) continue
      n++
      expect(p.chunks.join('')).toBe(p.ex.zh)
      if (p.ex.zh.includes(i.hanzi)) expect(p.chunks.some((c) => c.includes(i.hanzi)), i.hanzi).toBe(true)
    }
    expect(n).toBeGreaterThan(40)
  })
})
