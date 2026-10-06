/**
 * SEPA hromadný príkaz na úhradu (ISO 20022 pain.001.001.03) – výplaty e-zvončeka farnostiam.
 * Súbor sa nahrá do internetbankingu Fio (Import príkazov → SEPA XML). Bez prístupu k DB.
 */

export interface SepaTransfer {
  endToEndId: string
  amount: number
  creditorName: string
  creditorIban: string
  remittance: string
}

export interface SepaBatch {
  messageId: string
  debtorName: string
  debtorIban: string
  debtorBic: string
  executionDate: string // YYYY-MM-DD
  transfers: SepaTransfer[]
}

/** SEPA dovoľuje len základnú latinku – diakritiku odstránime, ostatné nepovolené znaky nahradíme medzerou. */
export function sepaText(value: string, max: number): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9/\-?:().,'+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const amt = (n: number) => n.toFixed(2)

export function buildSepaXml(batch: SepaBatch): string {
  const total = batch.transfers.reduce((a, t) => a + Math.round(t.amount * 100), 0) / 100
  const count = batch.transfers.length
  const now = new Date().toISOString().slice(0, 19)
  const debtor = esc(sepaText(batch.debtorName, 70))

  const txs = batch.transfers
    .map(
      (t) => `      <CdtTrfTxInf>
        <PmtId><EndToEndId>${esc(sepaText(t.endToEndId, 35))}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${amt(t.amount)}</InstdAmt></Amt>
        <Cdtr><Nm>${esc(sepaText(t.creditorName, 70))}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${esc(t.creditorIban)}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${esc(sepaText(t.remittance, 140))}</Ustrd></RmtInf>
      </CdtTrfTxInf>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${esc(sepaText(batch.messageId, 35))}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>${count}</NbOfTxs>
      <CtrlSum>${amt(total)}</CtrlSum>
      <InitgPty><Nm>${debtor}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${esc(sepaText(batch.messageId, 35))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${count}</NbOfTxs>
      <CtrlSum>${amt(total)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${batch.executionDate}</ReqdExctnDt>
      <Dbtr><Nm>${debtor}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${esc(batch.debtorIban)}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BIC>${esc(batch.debtorBic)}</BIC></FinInstnId></DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
${txs}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
`
}
