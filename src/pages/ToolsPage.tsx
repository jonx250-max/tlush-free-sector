import { useState, useMemo } from 'react'
import { Card, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { Calculator, ArrowLeftRight } from 'lucide-react'
import { he } from '../i18n/he'
import { grossToNet, netToGross, type NetGrossInput } from '../services/netGrossCalculator'
import type { CreditPointsInput } from '../services/taxCalculator'

const YEAR_OPTIONS = [
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
]

const fmt = (n: number) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n)

export function ToolsPage() {
  const [mode, setMode] = useState<'gross-to-net' | 'net-to-gross'>('gross-to-net')
  const [amount, setAmount] = useState('15000')
  const [year, setYear] = useState('2026')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [pensionPct, setPensionPct] = useState('6')
  const [kerenPct, setKerenPct] = useState('2.5')

  const input: NetGrossInput = useMemo(() => {
    const creditPointsInput: CreditPointsInput = {
      gender,
      childrenBirthYears: [],
      academicDegree: 'none',
      degreeCompletionYear: null,
      militaryService: { served: true, dischargeYear: 2020, monthsServed: 36, isCombat: false },
      isNewImmigrant: false,
      immigrationDate: null,
      disabilityPercentage: 0,
      isSingleParent: false,
      reservistDays2026: 0,
    }
    return {
      year: parseInt(year),
      gender,
      pensionEmployeePct: parseFloat(pensionPct) || 6,
      kerenEmployeePct: parseFloat(kerenPct) || 2.5,
      creditPointsInput,
    }
  }, [year, gender, pensionPct, kerenPct])

  const result = useMemo(() => {
    const num = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(num) || num <= 0) return null
    return mode === 'gross-to-net' ? grossToNet(num, input) : netToGross(num, input)
  }, [amount, mode, input])

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-heading text-2xl font-bold text-cs-text">{he.nav.tools}</h1>

      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cs-secondary/10">
            <Calculator size={22} className="text-cs-secondary" />
          </div>
          <CardTitle className="!mb-0">מחשבון נטו-ברוטו</CardTitle>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant={mode === 'gross-to-net' ? 'primary' : 'ghost'}
                onClick={() => setMode('gross-to-net')}
                className="text-sm"
              >
                ברוטו → נטו
              </Button>
              <ArrowLeftRight size={16} className="text-cs-muted" />
              <Button
                variant={mode === 'net-to-gross' ? 'primary' : 'ghost'}
                onClick={() => setMode('net-to-gross')}
                className="text-sm"
              >
                נטו → ברוטו
              </Button>
            </div>

            <Input
              label={mode === 'gross-to-net' ? 'שכר ברוטו (₪)' : 'שכר נטו (₪)'}
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Select
                label="שנה"
                options={YEAR_OPTIONS}
                value={year}
                onChange={e => setYear(e.target.value)}
              />
              <Select
                label="מין"
                options={[{ value: 'male', label: 'זכר' }, { value: 'female', label: 'נקבה' }]}
                value={gender}
                onChange={e => setGender(e.target.value as 'male' | 'female')}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input
                label="פנסיה עובד %"
                type="number"
                value={pensionPct}
                onChange={e => setPensionPct(e.target.value)}
              />
              <Input
                label="קרן השתלמות %"
                type="number"
                value={kerenPct}
                onChange={e => setKerenPct(e.target.value)}
              />
            </div>
          </div>

          {result && (
            <div className="rounded-xl border border-cs-border bg-cs-bg p-5">
              <h3 className="mb-4 font-heading text-lg font-bold text-cs-text">פירוט</h3>

              <div className="space-y-2 text-sm">
                <Row label="ברוטו" value={fmt(result.gross)} bold />
                <div className="border-t border-cs-border pt-2" />
                <Row label="מס הכנסה" value={`-${fmt(result.incomeTax)}`} color="danger" />
                <Row label="נקודות זיכוי" value={fmt(result.creditPointsValue)} color="success" sub />
                <Row label="ביטוח לאומי" value={`-${fmt(result.nationalInsurance)}`} color="danger" />
                <Row label="מס בריאות" value={`-${fmt(result.healthInsurance)}`} color="danger" />
                <Row label="פנסיה עובד" value={`-${fmt(result.pensionEmployee)}`} color="danger" />
                <Row label="קרן השתלמות" value={`-${fmt(result.kerenEmployee)}`} color="danger" />
                <div className="border-t border-cs-border pt-2" />
                <Row label="סה״כ ניכויים" value={fmt(result.totalDeductions)} bold />
                <div className="border-t-2 border-cs-primary pt-2" />
                <Row label="נטו לתשלום" value={`${fmt(result.net)} ₪`} bold primary />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function Row({ label, value, bold, color, primary, sub }: {
  label: string
  value: string
  bold?: boolean
  color?: 'danger' | 'success'
  primary?: boolean
  sub?: boolean
}) {
  const textColor = primary ? 'text-cs-primary'
    : color === 'danger' ? 'text-cs-danger'
      : color === 'success' ? 'text-cs-success'
        : 'text-cs-text'
  return (
    <div className={`flex justify-between ${sub ? 'pr-4 text-xs' : ''}`}>
      <span className={`text-cs-muted ${bold ? 'font-medium' : ''}`}>{label}</span>
      <span className={`${textColor} ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}
