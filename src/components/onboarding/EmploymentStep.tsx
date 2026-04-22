import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import type { PayModel } from '../../types'
import type { EmploymentData, Setter } from './types'

export function EmploymentStep({ data, onChange }: { data: EmploymentData; onChange: Setter<EmploymentData> }) {
  return (
    <div className="space-y-4">
      <Input label="שם מעסיק" value={data.employerName} onChange={e => onChange('employerName', e.target.value)} />
      <Input label="ח.פ./ע.מ. מעסיק" value={data.employerId} onChange={e => onChange('employerId', e.target.value)} />
      <Input label="תפקיד" value={data.jobTitle} onChange={e => onChange('jobTitle', e.target.value)} />
      <Input label="תאריך תחילת עבודה" type="date" value={data.startDate} onChange={e => onChange('startDate', e.target.value)} />

      <Select
        label="מודל שכר"
        value={data.payModel}
        onChange={e => onChange('payModel', e.target.value as PayModel)}
        options={[
          { value: 'monthly', label: 'חודשי רגיל' },
          { value: 'hourly', label: 'שעתי' },
          { value: 'shift', label: 'משמרות' },
          { value: 'commission', label: 'בסיס + עמלות' },
          { value: 'global', label: 'שכר גלובלי (כולל שעות נוספות)' },
        ]}
      />

      {data.payModel === 'global' && (
        <div className="rounded-lg border border-cs-warning/30 bg-cs-warning/5 p-3">
          <p className="text-sm font-medium text-cs-warning">שים לב — שכר גלובלי</p>
          <p className="mt-1 text-xs text-cs-muted">
            לפי תיקון 24 לחוק הגנת השכר, המעסיק חייב לפרט בתלוש השכר את השעות הנוספות בנפרד מהשכר הבסיסי.
          </p>
        </div>
      )}

      <Select
        label="ימי עבודה בשבוע"
        value={data.workDaysPerWeek}
        onChange={e => onChange('workDaysPerWeek', e.target.value as '5' | '6')}
        options={[
          { value: '5', label: '5 ימים' },
          { value: '6', label: '6 ימים' },
        ]}
      />
    </div>
  )
}
