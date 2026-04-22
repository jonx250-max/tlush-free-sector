import { Input } from '../ui/Input'
import type { PayModel } from '../../types'
import type { PayModelData, Setter } from './types'

export function PayModelStep({ payModel, data, onChange }: {
  payModel: PayModel
  data: PayModelData
  onChange: Setter<PayModelData>
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-bold text-cs-text">הפרשות וניכויים</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="פנסיה עובד (%)" type="number" step="0.5" value={data.pensionEmployee} onChange={e => onChange('pensionEmployee', e.target.value)} />
        <Input label="פנסיה מעסיק (%)" type="number" step="0.5" value={data.pensionEmployer} onChange={e => onChange('pensionEmployer', e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="keren" checked={data.hasKeren} onChange={e => onChange('hasKeren', e.target.checked)} className="h-4 w-4" />
        <label htmlFor="keren" className="text-sm text-cs-text">יש קרן השתלמות</label>
      </div>

      {data.hasKeren && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="קרן השתלמות עובד (%)" type="number" step="0.5" value={data.kerenEmployee} onChange={e => onChange('kerenEmployee', e.target.value)} />
          <Input label="קרן השתלמות מעסיק (%)" type="number" step="0.5" value={data.kerenEmployer} onChange={e => onChange('kerenEmployer', e.target.value)} />
        </div>
      )}

      {payModel === 'global' && (
        <>
          <h3 className="font-heading text-lg font-bold text-cs-text">שעות נוספות גלובליות</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="שעות נוספות כלולות בחודש" type="number" value={data.globalOvertimeHours} onChange={e => onChange('globalOvertimeHours', e.target.value)} />
            <Input label="סכום שעות נוספות גלובליות (₪)" type="number" value={data.globalOvertimeAmount} onChange={e => onChange('globalOvertimeAmount', e.target.value)} />
          </div>
        </>
      )}

      {payModel === 'hourly' && (
        <Input label="תעריף שעתי (₪)" type="number" value={data.hourlyRate} onChange={e => onChange('hourlyRate', e.target.value)} />
      )}
    </div>
  )
}
