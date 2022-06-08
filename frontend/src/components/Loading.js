// import { Spin } from 'antd'

// export default function Loading() {
//   return (
//     <div className="wrap-loading">
//       <Spin />
//       <p>Please wait...</p>
//     </div>
//   )
// }
import LaodingLogo from "../assets/loading.png";

export default function Loading() {
  return (
    <div className="wrap-loading">
      {/* <div className="bg-img-loading"> */}
      <img className="loading-img" src={LaodingLogo} />
      {/* </div> */}
    </div>
  );
}
