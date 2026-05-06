/**
 * Stage B Tier-2 archetypal scenarios for the diff engine.
 *
 * Six cases, each designed to exercise a different rule set. Snapshots lock
 * current calculator behavior so Stage E refactors surface unintended drift.
 *
 * Stage E will add Tier-1 hand-validated scenarios with statutory citations.
 */

import type { ScenarioSpec } from './builder'

export const SCENARIOS: ScenarioSpec[] = [
  // 1. Baseline — contract == payslip, no findings expected.
  {
    name: 'match-base-12000-2026',
    year: 2026,
    baseSalary: 12_000,
    payslipBase: 12_000,
    incomeTax: 1_290,
    nationalInsurance: 600,
    healthInsurance: 372,
    pensionEmployeePayslip: 720,
    pensionEmployerPayslip: 780,
  },

  // 2. Underpaid base — payslip 11500 vs contract 12000, base_pay critical.
  {
    name: 'underpaid-base-2026',
    year: 2026,
    baseSalary: 12_000,
    payslipBase: 11_500,
    grossSalary: 11_500,
    incomeTax: 1_180,
    nationalInsurance: 575,
  },

  // 3. Amendment 24 violation — contract specifies global OT but payslip
  //    does not separate base from overtime line.
  {
    name: 'amendment24-global-ot-not-separated-2026',
    year: 2026,
    baseSalary: 18_000,
    payModel: 'global',
    overtimeModel: 'global',
    globalOvertimeHours: 30,
    globalOvertimeAmount: 3_000,
    payslipBase: 21_000,        // base inflated, no separation
    grossSalary: 21_000,
    globalOvertimeLine: null,    // missing the dedicated line
    childrenBirthYears: [2020],
  },

  // 4. Eilat resident — 10% income exemption should apply; tax rule path
  //    different from non-Eilat.
  {
    name: 'eilat-resident-10000-2025',
    year: 2025,
    baseSalary: 10_000,
    workDaysPerWeek: 6,
    settlementZone: 'eilat',
    settlementCreditPoints: 0,
    settlementTaxDiscountPct: 0,
    incomeTax: 800,
    nationalInsurance: 500,
  },

  // 5. Pension shortfall — contract 6%/6.5%/8.33% but payslip shows 5%/5.5%/7%.
  {
    name: 'pension-shortfall-2024',
    year: 2024,
    baseSalary: 14_000,
    pensionEmployeePct: 6,
    pensionEmployerPct: 6.5,
    severanceEmployerPct: 8.33,
    pensionEmployeePayslip: 700,    // 5% of 14k = 700 (should be 840)
    pensionEmployerPayslip: 770,    // 5.5% of 14k = 770 (should be 910)
    severanceEmployerPayslip: 980,  // 7% of 14k = 980 (should be 1166)
    incomeTax: 1_500,
    nationalInsurance: 700,
  },

  // 6. Single parent + 2 kids — credit-point rich profile; no contract
  //    breaches, but tax analysis exercises the credit calculator.
  {
    name: 'single-parent-2kids-14000-2022',
    year: 2022,
    baseSalary: 14_000,
    payslipBase: 14_000,
    isSingleParent: true,
    childrenBirthYears: [2014, 2018],
    gender: 'female',
    incomeTax: 1_500,
    nationalInsurance: 700,
    healthInsurance: 434,
  },
]
