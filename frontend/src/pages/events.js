import React from 'react'
import EventsTable from '../components/EventsTable'

export default function Events() {
  return (
    <div>
      <div className='blocks-bg'>
        <div className='container'>
          <p className='blocks-title'>Events</p>
          <EventsTable />
        </div>
      </div>
    </div>
  )
}
