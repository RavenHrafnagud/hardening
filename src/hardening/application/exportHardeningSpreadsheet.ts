import type {
  AssignedUser,
  Equipment,
  EquipmentStatus,
  HardeningDatabase,
} from '../domain/hardening'

interface ExcelExportFile {
  content: string
  filename: string
  mimeType: string
}

const EXCEL_MIME_TYPE = 'application/vnd.ms-excel;charset=utf-8'

const formatExportDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const formatExportFilenameDate = () =>
  new Date().toISOString().slice(0, 10)

const formatStatus = (status: EquipmentStatus) =>
  status === 'assigned' ? 'Asignado' : 'Hardening'

const neutralizeFormula = (value: string) =>
  /^[=+\-@]/.test(value.trim()) ? `'${value}` : value

const escapeHtml = (value: string | number | undefined) =>
  neutralizeFormula(String(value ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildRow = (cells: Array<string | number | undefined>, tag = 'td') =>
  `<tr>${cells
    .map((cell) => `<${tag} style="mso-number-format:'\\@';">${escapeHtml(cell)}</${tag}>`)
    .join('')}</tr>`

const assignedUsersOrEmpty = (equipment: Equipment): Array<AssignedUser | null> =>
  equipment.assignedUsers.length ? equipment.assignedUsers : [null]

const buildEquipmentRows = (database: HardeningDatabase) =>
  database.equipments
    .flatMap((equipment) =>
      assignedUsersOrEmpty(equipment).map((assignedUser) =>
        buildRow([
          equipment.name,
          equipment.serial,
          equipment.assetId,
          equipment.anydeskId,
          formatStatus(equipment.status),
          equipment.bitlockerKey,
          assignedUser?.name ?? '',
          assignedUser?.gmail ?? '',
          assignedUser?.outlook ?? '',
          assignedUser?.area ?? '',
          assignedUser?.notes ?? '',
          assignedUser ? formatExportDate(assignedUser.assignedAt) : '',
          formatExportDate(equipment.createdAt),
          formatExportDate(equipment.updatedAt),
        ]),
      ),
    )
    .join('')

export const createHardeningExcelExport = (
  database: HardeningDatabase,
): ExcelExportFile => ({
  filename: `credismart-hardening-${formatExportFilenameDate()}.xls`,
  mimeType: EXCEL_MIME_TYPE,
  content: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; }
      th, td { border: 1px solid #cfd8e3; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #eef2f6; font-weight: 700; }
      caption { font-size: 18px; font-weight: 700; margin-bottom: 12px; text-align: left; }
    </style>
  </head>
  <body>
    <table>
      <caption>CrediSmart Hardening</caption>
      <thead>
        ${buildRow([
          'Equipo',
          'Serial',
          'ID activo',
          'AnyDesk',
          'Estado',
          'Llave BitLocker',
          'Usuario asignado',
          'Gmail',
          'Outlook',
          'Area',
          'Notas',
          'Fecha asignacion',
          'Creado',
          'Actualizado',
        ], 'th')}
      </thead>
      <tbody>
        ${buildEquipmentRows(database)}
      </tbody>
    </table>
  </body>
</html>`,
})
