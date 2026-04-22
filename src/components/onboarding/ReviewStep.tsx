import type { PayModel } from '../../types'
import type { PersonalData, EmploymentData, PayModelData } from './types'

export function ReviewStep({ personal, employment, payModelData }: {
  personal: PersonalData
  employment: EmploymentData
  payModelData: PayModelData
}) {
  const payModelLabel: Record<PayModel, string> = {
    monthly: 'חודשי רגיל',
    hourly: 'שעתי',
    shift: 'משמרות',
    commission: 'בסיס + עמלות',
    global: 'שכר גלובלי',
  }

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-lg font-bold text-cs-text">סיכום פרטים</h3>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-cs-muted">פרטים אישיים</h4>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-cs-muted">שם:</span> {personal.fullName}</p>
          <p><span className="text-cs-muted">מגדר:</span> {personal.gender === 'male' ? 'זכר' : 'נקבה'}</p>
          {personal.settlement && (
            <p><span className="text-cs-muted">ישוב:</span> {personal.settlement.name}</p>
          )}
          {personal.childrenBirthYears && (
            <p><span className="text-cs-muted">ילדים:</span> {personal.childrenBirthYears}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-cs-muted">פרטי העסקה</h4>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-cs-muted">מעסיק:</span> {employment.employerName}</p>
          <p><span className="text-cs-muted">תפקיד:</span> {employment.jobTitle}</p>
          <p><span className="text-cs-muted">מודל:</span> {payModelLabel[employment.payModel]}</p>
          <p><span className="text-cs-muted">ימי עבודה:</span> {employment.workDaysPerWeek}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-cs-muted">הפרשות</h4>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-cs-muted">פנסיה עובד:</span> {payModelData.pensionEmployee}%</p>
          <p><span className="text-cs-muted">פנסיה מעסיק:</span> {payModelData.pensionEmployer}%</p>
          {payModelData.hasKeren && (
            <>
              <p><span className="text-cs-muted">קה"ש עובד:</span> {payModelData.kerenEmployee}%</p>
              <p><span className="text-cs-muted">קה"ש מעסיק:</span> {payModelData.kerenEmployer}%</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
