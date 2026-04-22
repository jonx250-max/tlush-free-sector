import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { SettlementSelector } from '../ui/SettlementSelector'
import { he } from '../../i18n/he'
import type { PersonalData, Setter } from './types'

export function PersonalInfoStep({ data, onChange }: { data: PersonalData; onChange: Setter<PersonalData> }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={he.onboarding.fullName} value={data.fullName} onChange={e => onChange('fullName', e.target.value)} />
        <Input label="תעודת זהות" value={data.idNumber} onChange={e => onChange('idNumber', e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="מגדר"
          value={data.gender}
          onChange={e => onChange('gender', e.target.value as 'male' | 'female')}
          options={[{ value: 'male', label: 'זכר' }, { value: 'female', label: 'נקבה' }]}
        />
        <Select
          label="מצב משפחתי"
          value={data.maritalStatus}
          onChange={e => onChange('maritalStatus', e.target.value)}
          options={[
            { value: 'single', label: 'רווק/ה' },
            { value: 'married', label: 'נשוי/אה' },
            { value: 'divorced', label: 'גרוש/ה' },
            { value: 'widowed', label: 'אלמן/ה' },
          ]}
        />
      </div>

      <Input
        label="שנות לידה של ילדים (מופרד בפסיקים)"
        placeholder="2020, 2022, 2024"
        value={data.childrenBirthYears}
        onChange={e => onChange('childrenBirthYears', e.target.value)}
      />

      <SettlementSelector
        value={data.settlement}
        onChange={s => onChange('settlement', s)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="השכלה אקדמית"
          value={data.academicDegree}
          onChange={e => onChange('academicDegree', e.target.value)}
          options={[
            { value: 'none', label: 'ללא' },
            { value: 'ba', label: 'תואר ראשון' },
            { value: 'ma', label: 'תואר שני' },
            { value: 'phd', label: 'דוקטורט' },
          ]}
        />
        {data.academicDegree !== 'none' && (
          <Input
            label="שנת סיום תואר"
            type="number"
            value={data.degreeCompletionYear}
            onChange={e => onChange('degreeCompletionYear', e.target.value)}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="military"
          checked={data.militaryServed}
          onChange={e => onChange('militaryServed', e.target.checked)}
          className="h-4 w-4 rounded border-cs-border"
        />
        <label htmlFor="military" className="text-sm text-cs-text">שירתתי בצה"ל / שירות לאומי</label>
      </div>

      {data.militaryServed && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="שנת שחרור" type="number" value={data.militaryDischargeYear} onChange={e => onChange('militaryDischargeYear', e.target.value)} />
          <Input label="חודשי שירות" type="number" value={data.militaryMonths} onChange={e => onChange('militaryMonths', e.target.value)} />
          <div className="flex items-end">
            <div className="flex items-center gap-2 pb-2">
              <input type="checkbox" id="combat" checked={data.militaryCombat} onChange={e => onChange('militaryCombat', e.target.checked)} className="h-4 w-4" />
              <label htmlFor="combat" className="text-sm">לוחם/ת</label>
            </div>
          </div>
        </div>
      )}

      <Input
        label="ימי מילואים בשנת 2026"
        type="number"
        value={data.reservistDays}
        onChange={e => onChange('reservistDays', e.target.value)}
        placeholder="0"
      />

      <div className="flex items-center gap-3">
        <input type="checkbox" id="singleParent" checked={data.isSingleParent} onChange={e => onChange('isSingleParent', e.target.checked)} className="h-4 w-4" />
        <label htmlFor="singleParent" className="text-sm text-cs-text">הורה יחיד/נית</label>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="immigrant" checked={data.isNewImmigrant} onChange={e => onChange('isNewImmigrant', e.target.checked)} className="h-4 w-4" />
        <label htmlFor="immigrant" className="text-sm text-cs-text">עולה חדש/ה</label>
      </div>

      {data.isNewImmigrant && (
        <Input label="תאריך עלייה" type="date" value={data.immigrationDate} onChange={e => onChange('immigrationDate', e.target.value)} />
      )}
    </div>
  )
}
