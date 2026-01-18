import * as React from 'react'

const Flag = ({type}:{type:'gr'|'ru'|'ro'|'sl'}) => {
  switch(type){
    case 'gr': return <svg className="flag" viewBox="0 0 64 42"><rect width="64" height="42" fill="#0D5EAF"/><g fill="#fff"><rect x="0" y="16" width="64" height="6"/><rect x="0" y="28" width="64" height="6"/><rect x="0" y="4" width="64" height="6"/><rect x="0" y="40" width="64" height="2"/></g><g><rect width="28" height="24" fill="#0D5EAF"/><rect x="10" width="6" height="24" fill="#fff"/><rect y="9" width="28" height="6" fill="#fff"/></g></svg>
    case 'ru': return <svg className="flag" viewBox="0 0 64 42"><rect width="64" height="14" fill="#fff"/><rect y="14" width="64" height="14" fill="#0D5EAF"/><rect y="28" width="64" height="14" fill="#CE1126"/></svg>
    case 'ro': return <svg className="flag" viewBox="0 0 64 42"><rect width="21.33" height="42" fill="#002B7F"/><rect x="21.33" width="21.33" height="42" fill="#FCD116"/><rect x="42.66" width="21.33" height="42" fill="#CE1126"/></svg>
    default: return <svg className="flag" viewBox="0 0 64 42"><rect width="64" height="42" fill="#1d2a44"/><text x="32" y="26" fontSize="16" textAnchor="middle" fill="#C8A24B">☦</text></svg>
  }
}

type KV={k:string;v:string}
const MiniCard = ({flag,label,sub,title,sample,fields}:{flag:'gr'|'ru'|'ro'|'sl';label:string;sub:string;title:string;sample:KV[];fields:KV[]}) => (
  <div className="mini">
    <div className="badge">✝</div>
    <div className="bar">
      <Flag type={flag}/>
      <div>
        <div className="lbl">{label}</div>
        <div className="sub">{sub}</div>
      </div>
    </div>
    <div className="snip">
      {sample.map((r,i)=><div key={i}><span className="k">{r.k}</span>: <span className="v">{r.v}</span></div>)}
    </div>
    <dl className="fields">
      <div style={{gridColumn:'1 / -1',fontWeight:900,fontSize:'18px',marginTop:'6px'}}>{title}</div>
      {fields.map((r,i)=>(<React.Fragment key={i}><dt>{r.k}</dt><dd>{r.v}</dd></React.Fragment>))}
    </dl>
  </div>
)

export const RecordsMiniShowcase: React.FC = () => {
  const cards = [
    {flag:'gr',label:'Αρχεία Βαπτίσεων',sub:'Baptism (Greek)',title:'Βάπτιση',sample:[{k:'Όνομα',v:'Μαρία'},{k:'Επώνυμο',v:'Παπαδοπούλου'}],fields:[{k:'Τόπος',v:'Αθήνα'},{k:'Ημ. Βάπτισης',v:'1990-04-01'}]},
    {flag:'ru',label:'Записи о Браке',sub:'Marriage (Russian)',title:'Бракосочетание',sample:[{k:'Жених',v:'Александр'},{k:'Невеста',v:'Мария'}],fields:[{k:'Дата',v:'2012-06-17'},{k:'Свящ.',v:'Пр. Николай'}]},
    {flag:'ro',label:'Registre de Înmormântări',sub:'Funeral (Romanian)',title:'Înmormântare',sample:[{k:'Prenume',v:'Ion'},{k:'Nume',v:'Popescu'}],fields:[{k:'Data',v:'2021-03-12'},{k:'Locul',v:'București'}]},
    {flag:'sl',label:'Церковныя записи',sub:'Church (Slavonic)',title:'Церковныя книги',sample:[{k:'Имѧ',v:'Іоанн'},{k:'Родъ',v:'Петровъ'}],fields:[{k:'Мѣсто',v:'Св. Николы'},{k:'Лѣто',v:'Аѳіѳ'}]},
  ] as const

  return (
    <div>
      <div className="title">Records Mini Showcase</div>
      <div className="sub">Self-contained, no dependencies, safe in /public</div>
      <div className="grid">
        {cards.map((c,i)=><MiniCard key={i} {...c}/>)}
      </div>
    </div>
  )
}

