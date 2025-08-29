// src/App.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { db } from './firebase'
import {
  addDoc, collection, serverTimestamp, onSnapshot,
  doc, setDoc, updateDoc, getDoc
} from 'firebase/firestore'

const COUPONS = [
  { id:'snack',   title:'🍫 Order a Snack for Me', cooldown:8,  needsNote:true },
  { id:'song',    title:'🎶 Sing Me a Song',       cooldown:8 },
  { id:'date',    title:'💖 Plan a Date',          cooldown:15 },
  { id:'game',    title:'🎮 Play a Game with Me',  cooldown:8 },
  { id:'dessert', title:'🍰 Order Desserts',       cooldown:8 },
  { id:'pics',    title:'📸 Send Pictures',        cooldown:8 },
  { id:'nice',    title:'✍️ Write Something Nice', cooldown:8 },
]

const OWNER_PIN = import.meta.env.VITE_OWNER_PIN || '152118'

export default function App(){
  const [screenSplash, setScreenSplash] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [pin, setPin] = useState('')
  const [noteDrafts, setNoteDrafts] = useState({})

  const [requests, setRequests] = useState([])
  const [cooldowns, setCooldowns] = useState({})
  const now = Date.now()

  useEffect(()=>{ const t=setTimeout(()=>setScreenSplash(false),3000); return ()=>clearTimeout(t)},[])

  useEffect(()=>{
    const unsub = onSnapshot(collection(db,'requests'), snap=>{
      const arr = []
      snap.forEach(d=> arr.push({ id:d.id, ...d.data() }))
      arr.sort((a,b)=> (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      setRequests(arr)
    }, err=> console.error('requests onSnapshot error', err))
    return ()=> unsub()
  },[])

  useEffect(()=>{
    const ref = doc(db,'meta','cooldowns')
    const unsub = onSnapshot(ref, snap=>{
      if(snap.exists()) setCooldowns(snap.data().map || {})
      else setCooldowns({})
    }, err=> console.error('cooldowns onSnapshot error', err))
    return ()=> unsub()
  },[])

  const daysSinceLast = useMemo(()=>{
    if(requests.length===0) return '—'
    const last = requests[0].createdAt?.toMillis?.() ?? Date.now()
    return String(Math.floor((now - last)/(1000*60*60*24)))
  },[requests, now])

  function isLocked(id){
    const until = cooldowns[id]
    return Boolean(until && now < until)
  }
  function remainingDays(id){
    const until = cooldowns[id]
    if(!until) return 0
    return Math.max(0, Math.ceil((until-now)/(1000*60*60*24)))
  }

  async function confirmRedeem(coupon){
    try{
      if(isLocked(coupon.id)){
        alert(`⏳ "${coupon.title}" is on cooldown. Try again in ${remainingDays(coupon.id)} day(s).`)
        return
      }
      await addDoc(collection(db,'requests'), {
        couponId: coupon.id,
        title: coupon.title,
        note: noteDrafts[coupon.id] || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      })

      const ref = doc(db,'meta','cooldowns')
      let map = {}
      try{
        const snap = await getDoc(ref)
        map = (snap.exists() && snap.data().map) ? snap.data().map : {}
      }catch(e){ console.warn('cooldowns getDoc failed; will create', e) }
      map[coupon.id] = Date.now() + coupon.cooldown*24*60*60*1000
      await setDoc(ref, { map }, { merge:true })

      setNoteDrafts(p=> ({...p, [coupon.id]: ''}))
      alert('🎁 Coupon redeemed!')
    }catch(e){
      console.error('confirmRedeem error:', e)
      alert('❌ Could not redeem. Check Firebase config / Firestore enabled.')
    }
  }

  async function markCompleted(reqId){
    try{
      await updateDoc(doc(db,'requests', reqId), { status:'completed' })
    }catch(e){
      console.error('markCompleted error:', e)
      alert('❌ Could not update status. Check Firestore rules.')
    }
  }

  if(screenSplash) return <div className="welcome">HELLO BHAVYA 💕</div>

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>🌸 CoupUp</h1>
        <div className="badge">Days since last coupon: {daysSinceLast}</div>
        <div className="muted">Most coupons: 8 days cooldown • Plan a Date: 15 days</div>
        <div className="actions">
          {!isOwner
            ? <button className="btn" onClick={()=> setShowPin(true)}>🔑 Owner Login</button>
            : <button className="btn secondary" onClick={()=> setIsOwner(false)}>Logout Owner</button>}
        </div>
      </aside>

      <section className="grid">
        {COUPONS.map(c=>{
          const locked = isLocked(c.id)
          return (
            <div className="card" key={c.id}>
              {locked && <div className="badge-lock">Recharging • {remainingDays(c.id)}d</div>}
              <h3>{c.title}</h3>
              {!locked ? (
                <>
                  {c.needsNote && (
                    <textarea
                      className="note"
                      placeholder="Anything specific on your mind?"
                      value={noteDrafts[c.id] || ''}
                      onChange={e=> setNoteDrafts(p=> ({...p, [c.id]: e.target.value}))}
                    />
                  )}
                  <div style={{display:'flex', gap:8, marginTop:10}}>
                    <button className="btn" onClick={()=> confirmRedeem(c)}>Redeem</button>
                  </div>
                </>
              ) : (
                <div className="small">Come back when cooldown ends ✨</div>
              )}
            </div>
          )
        })}

        {isOwner && (
          <div className="card" style={{gridColumn:'1 / -1'}}>
            <h3>📋 Redemption Requests</h3>
            <div className="requests">
              {requests.length===0 && <div className="small">No requests yet.</div>}
              {requests.map(r=> (
                <div className="req" key={r.id}>
                  <div>
                    <div style={{fontWeight:700}}>{r.title}</div>
                    {r.note && <div className="meta">Note: {r.note}</div>}
                    <div className="meta">
                      {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '—'} • {r.status}
                    </div>
                  </div>
                  {r.status!=='completed' && (
                    <button className="btn" onClick={()=> markCompleted(r.id)}>Mark Completed</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {showPin && (
        <div className="modal" onClick={()=> setShowPin(false)}>
          <div className="panel" onClick={e=> e.stopPropagation()}>
            <h3>Enter Owner PIN</h3>
            <input className="pin" type="password" value={pin} onChange={e=> setPin(e.target.value)} placeholder="••••••" />
            <div className="row">
              <button className="btn secondary" onClick={()=> setShowPin(false)}>Cancel</button>
              <button className="btn" onClick={()=>{
                if(pin===OWNER_PIN){ setIsOwner(true); setShowPin(false); setPin('') }
                else alert('Wrong PIN')
              }}>Login</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
