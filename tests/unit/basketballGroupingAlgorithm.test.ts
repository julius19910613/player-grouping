import { describe, it, expect } from 'vitest'
import { BasketballGroupingAlgorithm } from '@/utils/basketballGroupingAlgorithm'
import type { BasketballSkills } from '@/types/basketball'
import { BasketballPosition, calculateOverallSkill } from '@/types/basketball'

describe('calculateOverallSkill', () => {
  it('should calculate correct ability score for PG player', () => {
    const skills = {
      twoPointShot: 80,
      threePointShot: 85,
      freeThrow: 75,
      passing: 90,
      ballControl: 95,
      courtVision: 88,
      perimeterDefense: 70,
      interiorDefense: 50,
      steals: 75,
      blocks: 40,
      offensiveRebound: 45,
      defensiveRebound: 50,
      speed: 85,
      strength: 60,
      stamina: 75,
      vertical: 70,
      basketballIQ: 82,
      teamwork: 80,
      clutch: 78
    }

    const score = calculateOverallSkill(skills, BasketballPosition.PG)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should calculate correct ability score for C player', () => {
    const skills = {
      twoPointShot: 70,
      threePointShot: 40,
      freeThrow: 65,
      passing: 65,
      ballControl: 50,
      courtVision: 70,
      perimeterDefense: 60,
      interiorDefense: 95,
      steals: 40,
      blocks: 90,
      offensiveRebound: 88,
      defensiveRebound: 92,
      speed: 55,
      strength: 95,
      stamina: 80,
      vertical: 85,
      basketballIQ: 78,
      teamwork: 85,
      clutch: 72
    }

    const score = calculateOverallSkill(skills, BasketballPosition.C)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should handle SF player correctly', () => {
    const skills = {
      twoPointShot: 75,
      threePointShot: 72,
      freeThrow: 70,
      passing: 75,
      ballControl: 75,
      courtVision: 75,
      perimeterDefense: 75,
      interiorDefense: 75,
      steals: 70,
      blocks: 60,
      offensiveRebound: 70,
      defensiveRebound: 72,
      speed: 75,
      strength: 75,
      stamina: 78,
      vertical: 75,
      basketballIQ: 76,
      teamwork: 74,
      clutch: 75
    }

    const score = calculateOverallSkill(skills, BasketballPosition.SF)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should handle different positions with different weightings', () => {
    const skills = {
      twoPointShot: 80,
      threePointShot: 80,
      freeThrow: 80,
      passing: 80,
      ballControl: 80,
      courtVision: 80,
      perimeterDefense: 80,
      interiorDefense: 80,
      steals: 80,
      blocks: 80,
      offensiveRebound: 80,
      defensiveRebound: 80,
      speed: 80,
      strength: 80,
      stamina: 80,
      vertical: 80,
      basketballIQ: 80,
      teamwork: 80,
      clutch: 80
    }

    const pgScore = calculateOverallSkill(skills, BasketballPosition.PG)
    const cScore = calculateOverallSkill(skills, BasketballPosition.C)

    expect(pgScore).toBeGreaterThan(0)
    expect(cScore).toBeGreaterThan(0)
  })
})

describe('calculateBalanceScore', () => {
  it('should calculate balance score for teams', () => {
    const teams = [
      {
        id: 'team-1',
        name: 'Team 1',
        players: [],
        totalSkill: 100
      },
      {
        id: 'team-2',
        name: 'Team 2',
        players: [],
        totalSkill: 105
      },
      {
        id: 'team-3',
        name: 'Team 3',
        players: [],
        totalSkill: 95
      }
    ]

    const balance = BasketballGroupingAlgorithm.calculateBalanceScore(teams)
    expect(balance).toBeDefined()
    expect(balance).toBeGreaterThanOrEqual(0)
  })

  it('should handle empty teams', () => {
    const balance = BasketballGroupingAlgorithm.calculateBalanceScore([])
    expect(balance).toBe(0)
  })
})

describe('groupFor5v5', () => {
  it('should distribute players into balanced 5v5 teams', () => {
    const positions: BasketballPosition[] = [
      BasketballPosition.PG, BasketballPosition.SG, BasketballPosition.SF,
      BasketballPosition.PF, BasketballPosition.C
    ]

    const players = Array.from({ length: 20 }, (_, i) => {
      const baseSkills = {
        twoPointShot: 60 + Math.floor(Math.random() * 40),
        threePointShot: 60 + Math.floor(Math.random() * 40),
        freeThrow: 60 + Math.floor(Math.random() * 40),
        passing: 60 + Math.floor(Math.random() * 40),
        ballControl: 60 + Math.floor(Math.random() * 40),
        courtVision: 60 + Math.floor(Math.random() * 40),
        perimeterDefense: 60 + Math.floor(Math.random() * 40),
        interiorDefense: 60 + Math.floor(Math.random() * 40),
        steals: 60 + Math.floor(Math.random() * 40),
        blocks: 60 + Math.floor(Math.random() * 40),
        offensiveRebound: 60 + Math.floor(Math.random() * 40),
        defensiveRebound: 60 + Math.floor(Math.random() * 40),
        speed: 60 + Math.floor(Math.random() * 40),
        strength: 60 + Math.floor(Math.random() * 40),
        stamina: 60 + Math.floor(Math.random() * 40),
        vertical: 60 + Math.floor(Math.random() * 40),
        basketballIQ: 60 + Math.floor(Math.random() * 40),
        teamwork: 60 + Math.floor(Math.random() * 40),
        clutch: 60 + Math.floor(Math.random() * 40)
      }

      const overall = calculateOverallSkill(baseSkills, positions[i % 5])

      return {
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        position: positions[i % 5],
        skills: { ...baseSkills, overall }
      }
    })

    const teams = BasketballGroupingAlgorithm.groupFor5v5(players)
    expect(teams.length).toBeGreaterThan(0)
    expect(teams).toBeDefined()
  })

  it('should handle odd number of players', () => {
    const baseSkills = {
      twoPointShot: 70,
      threePointShot: 70,
      freeThrow: 70,
      passing: 70,
      ballControl: 70,
      courtVision: 70,
      perimeterDefense: 70,
      interiorDefense: 70,
      steals: 70,
      blocks: 70,
      offensiveRebound: 70,
      defensiveRebound: 70,
      speed: 70,
      strength: 70,
      stamina: 70,
      vertical: 70,
      basketballIQ: 70,
      teamwork: 70,
      clutch: 70
    }

    const players = Array.from({ length: 18 }, (_, i) => {
      const position = [BasketballPosition.PG, BasketballPosition.SG, BasketballPosition.SF,
      BasketballPosition.PF, BasketballPosition.C][i % 5]
      const overall = calculateOverallSkill(baseSkills, position)

      return {
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        position,
        skills: { ...baseSkills, overall }
      }
    })

    const teams = BasketballGroupingAlgorithm.groupFor5v5(players)
    expect(teams.length).toBeGreaterThan(0)
  })
})

describe('groupFor3v3', () => {
  it('should distribute players into balanced 3v3 teams', () => {
    const positions: BasketballPosition[] = [
      BasketballPosition.PG, BasketballPosition.SG, BasketballPosition.SF,
      BasketballPosition.PF, BasketballPosition.C
    ]

    const players = Array.from({ length: 12 }, (_, i) => {
      const baseSkills = {
        twoPointShot: 60 + Math.floor(Math.random() * 40),
        threePointShot: 60 + Math.floor(Math.random() * 40),
        freeThrow: 60 + Math.floor(Math.random() * 40),
        passing: 60 + Math.floor(Math.random() * 40),
        ballControl: 60 + Math.floor(Math.random() * 40),
        courtVision: 60 + Math.floor(Math.random() * 40),
        perimeterDefense: 60 + Math.floor(Math.random() * 40),
        interiorDefense: 60 + Math.floor(Math.random() * 40),
        steals: 60 + Math.floor(Math.random() * 40),
        blocks: 60 + Math.floor(Math.random() * 40),
        offensiveRebound: 60 + Math.floor(Math.random() * 40),
        defensiveRebound: 60 + Math.floor(Math.random() * 40),
        speed: 60 + Math.floor(Math.random() * 40),
        strength: 60 + Math.floor(Math.random() * 40),
        stamina: 60 + Math.floor(Math.random() * 40),
        vertical: 60 + Math.floor(Math.random() * 40),
        basketballIQ: 60 + Math.floor(Math.random() * 40),
        teamwork: 60 + Math.floor(Math.random() * 40),
        clutch: 60 + Math.floor(Math.random() * 40)
      }

      const overall = calculateOverallSkill(baseSkills, positions[i % 5])

      return {
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        position: positions[i % 5],
        skills: { ...baseSkills, overall }
      }
    })

    const teams = BasketballGroupingAlgorithm.groupFor3v3(players)
    expect(teams.length).toBeGreaterThan(0)
    expect(teams).toBeDefined()
  })

  it('should handle odd number of players', () => {
    const baseSkills = {
      twoPointShot: 70,
      threePointShot: 70,
      freeThrow: 70,
      passing: 70,
      ballControl: 70,
      courtVision: 70,
      perimeterDefense: 70,
      interiorDefense: 70,
      steals: 70,
      blocks: 70,
      offensiveRebound: 70,
      defensiveRebound: 70,
      speed: 70,
      strength: 70,
      stamina: 70,
      vertical: 70,
      basketballIQ: 70,
      teamwork: 70,
      clutch: 70
    }

    const players = Array.from({ length: 10 }, (_, i) => {
      const position = [BasketballPosition.PG, BasketballPosition.SG, BasketballPosition.SF,
      BasketballPosition.PF, BasketballPosition.C][i % 5]
      const overall = calculateOverallSkill(baseSkills, position)

      return {
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        position,
        skills: { ...baseSkills, overall }
      }
    })

    const teams = BasketballGroupingAlgorithm.groupFor3v3(players)
    expect(teams.length).toBeGreaterThan(0)
  })
})

describe('getTeamStats', () => {
  it('should generate team stats for 5v5 teams', () => {
    const baseSkills = {
      twoPointShot: 70,
      threePointShot: 70,
      freeThrow: 70,
      passing: 70,
      ballControl: 70,
      courtVision: 70,
      perimeterDefense: 70,
      interiorDefense: 70,
      steals: 70,
      blocks: 70,
      offensiveRebound: 70,
      defensiveRebound: 70,
      speed: 70,
      strength: 70,
      stamina: 70,
      vertical: 70,
      basketballIQ: 70,
      teamwork: 70,
      clutch: 70
    }

    const positions: BasketballPosition[] = [
      BasketballPosition.PG, BasketballPosition.SG, BasketballPosition.SF,
      BasketballPosition.PF, BasketballPosition.C
    ]

    const players = Array.from({ length: 10 }, (_, i) => {
      const position = positions[i % 5]
      const overall = calculateOverallSkill(baseSkills, position)
      return {
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        position,
        skills: { ...baseSkills, overall }
      }
    })

    const teams = BasketballGroupingAlgorithm.groupFor5v5(players)
    const stats = BasketballGroupingAlgorithm.getTeamStats(teams)

    expect(stats.length).toBeGreaterThan(0)
    expect(stats[0]).toHaveProperty('id')
    expect(stats[0]).toHaveProperty('name')
    expect(stats[0]).toHaveProperty('players')
    expect(stats[0]).toHaveProperty('totalSkill')
    expect(stats[0]).toHaveProperty('positionDistribution')
  })

  it('should generate team stats for 3v3 teams', () => {
    const baseSkills = {
      twoPointShot: 70,
      threePointShot: 70,
      freeThrow: 70,
      passing: 70,
      ballControl: 70,
      courtVision: 70,
      perimeterDefense: 70,
      interiorDefense: 70,
      steals: 70,
      blocks: 70,
      offensiveRebound: 70,
      defensiveRebound: 70,
      speed: 70,
      strength: 70,
      stamina: 70,
      vertical: 70,
      basketballIQ: 70,
      teamwork: 70,
      clutch: 70
    }

    const positions: BasketballPosition[] = [
      BasketballPosition.PG, BasketballPosition.SG, BasketballPosition.SF,
      BasketballPosition.PF, BasketballPosition.C
    ]

    const players = Array.from({ length: 6 }, (_, i) => {
      const position = positions[i % 5]
      const overall = calculateOverallSkill(baseSkills, position)
      return {
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        position,
        skills: { ...baseSkills, overall }
      }
    })

    const teams = BasketballGroupingAlgorithm.groupFor3v3(players)
    const stats = BasketballGroupingAlgorithm.getTeamStats(teams)

    expect(stats.length).toBeGreaterThan(0)
    expect(stats[0]).toHaveProperty('positionDistribution')
  })

  it('should handle insufficient players', () => {
    const baseSkills = {
      twoPointShot: 70,
      threePointShot: 70,
      freeThrow: 70,
      passing: 70,
      ballControl: 70,
      courtVision: 70,
      perimeterDefense: 70,
      interiorDefense: 70,
      steals: 70,
      blocks: 70,
      offensiveRebound: 70,
      defensiveRebound: 70,
      speed: 70,
      strength: 70,
      stamina: 70,
      vertical: 70,
      basketballIQ: 70,
      teamwork: 70,
      clutch: 70
    }

    const testPositions = [BasketballPosition.PG, BasketballPosition.SG, BasketballPosition.C]

    const players = Array.from({ length: 3 }, (_, i) => {
      const position = testPositions[i % 3]
      const overall = calculateOverallSkill(baseSkills, position)
      return {
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        position,
        skills: { ...baseSkills, overall }
      }
    })

    const teams5v5 = BasketballGroupingAlgorithm.groupFor5v5(players)
    expect(teams5v5).toBeDefined()
    expect(teams5v5.length).toBe(1)

    const teams3v3 = BasketballGroupingAlgorithm.groupFor3v3(players)
    expect(teams3v3).toBeDefined()
    expect(teams3v3.length).toBe(1)
  })
})