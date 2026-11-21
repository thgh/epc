import { describe, expect, test } from 'bun:test'
import { labelFromScore } from '../calc/label'

describe('labelFromScore', () => {
  test('official residential bands', () => {
    expect(labelFromScore(-10)).toBe('A+')
    expect(labelFromScore(0)).toBe('A+')
    expect(labelFromScore(1)).toBe('A')
    expect(labelFromScore(100)).toBe('A')
    expect(labelFromScore(101)).toBe('B')
    expect(labelFromScore(200)).toBe('B')
    expect(labelFromScore(201)).toBe('C')
    expect(labelFromScore(300)).toBe('C')
    expect(labelFromScore(301)).toBe('D')
    expect(labelFromScore(400)).toBe('D')
    expect(labelFromScore(401)).toBe('E')
    expect(labelFromScore(500)).toBe('E')
    expect(labelFromScore(501)).toBe('F')
  })
})
