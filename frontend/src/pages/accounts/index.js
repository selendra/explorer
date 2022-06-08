import { useState } from "react";
import AccountsTable from "../../components/AccountsTable";
import useFetch from "../../hooks/useFetch";
import LaodingLogo from "../../assets/loading.png";
export default function Accounts() {
  const [page, setPage] = useState(1);
  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/account/all/${page}`
  );

  return (
    <div>
      <div className="blocks-bg">
        <div className="container">
          <p className="blocks-title">Accounts</p>
          <AccountsTable
            // loading={loading}
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
  );
}
