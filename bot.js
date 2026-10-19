const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
let turf = { total: 0, perHead: 0, players: [], paid: [] }

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({ auth: state, printQRInTerminal: true })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (u) => {
    if(u.connection==='open') console.log('TURF BOT ONLINE ✅')
    if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) start()
  })

  sock.ev.on('messages.upsert', async ({messages}) => {
    const m=messages[0]; if(!m.message||m.key.fromMe) return
    const text=m.message.conversation||m.message.extendedTextMessage?.text||''; const lower=text.toLowerCase(); const gid=m.key.remoteJid
    if(!gid.endsWith('@g.us')) return

    const meta=await sock.groupMetadata(gid).catch(()=>null)
    const autoCount = meta ? meta.participants.length-1 : 6

    // TURF 1030+500 /6  or  turf 1530  or  split 1500/5
    if(lower.startsWith('turf')||lower.startsWith('split')){
      let total=0,count=autoCount
      let m1=text.match(/([0-9\+\s]+)\/\s*(\d+)/)
      if(m1){ try{total=eval(m1[1])}catch{}; count=parseInt(m1[2]) }
      else { 
        let expr=text.match(/[0-9\+\-\*\/\(\)\s]+/)?.[0]; if(expr) try{total=eval(expr)}catch{}
        let nums=text.match(/\d+/g); if(nums&&nums.length>1&&total>100) count=parseInt(nums[nums.length-1])
      }
      if(total>0){
        turf.total=total; turf.perHead=Math.ceil(total/count)
        turf.players = meta ? meta.participants.filter(p=>!p.id.includes(sock.user.id.split(':')[0])).slice(0,count).map(p=>p.notify||p.id.split('@')[0]) : Array.from({length:count},(_,i)=>`Player${i+1}`)
        turf.paid=Array(count).fill(false)
        await sock.sendMessage(gid,{text:`🏟️ *TURF AUTO SPLIT*\nTotal: ₹${total}\nLog: ${count}\nPer Head: ₹${turf.perHead}\n\n${turf.players.map((p,i)=>`${i+1}. ${p} - ₹${turf.perHead} - ⬜ Pending`).join('\n')}\n\n> paid 1\n> paid @Aman\n> pending`})
      }
    }
    if(lower.startsWith('paid')){
      let idx=-1; let num=text.match(/\d+/)?.[0]
      if(text.includes('@')){ let n=text.split('@')[1].toLowerCase(); idx=turf.players.findIndex(p=>p.toLowerCase().includes(n)) }
      else if(num) idx=parseInt(num)-1
      if(idx>=0){ turf.paid[idx]=true; await sock.sendMessage(gid,{text:`✅ ${turf.players[idx]} Paid!\nPending: ${turf.players.filter((_,i)=>!turf.paid[i]).join(', ')||'All Done 🎉'}`}) }
    }
    if(lower==='pending'){
      let p=turf.players.filter((_,i)=>!turf.paid[i])
      await sock.sendMessage(gid,{text:`⏳ Pending: ${p.join(', ')||'Zero 🎉'}\nTotal Bacha: ₹${p.length*turf.perHead}`})
    }
  })
}
start()