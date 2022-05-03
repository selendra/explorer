import { Spin } from 'antd'

export default function Loading() {
  return (
    <div className="wrap-loading">
      <Spin />
      <p>Please wait...</p>
    </div>
  )
}
