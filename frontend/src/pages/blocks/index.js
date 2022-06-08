import { useState } from "react";
import useFetch from "../../hooks/useFetch";
import BlocksTable from "../../components/BlocksTable";
import LaodingLogo from "../../assets/loading.png";
export default function Blocks() {
  const [page, setPage] = useState(1);
  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/block/all/${page}`
  );
  // console.log(data)

  return (
    <div>
      <div className="blocks-bg">
        <div className="container">
          <p className="blocks-title">Blocks</p>
          <div className="spacing" />
          <div>
            <BlocksTable
              loading={{
                indicator: (
                  <div>
                    <img className="loading-img-block" src={LaodingLogo} />
                  </div>
                ),
                spinning: !data,
              }}
              data={data}
              onChange={setPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
