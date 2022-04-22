import AccountsTable from "../components/AccountsTable";

export default function Accounts() {
  return (
    <div>
      <div className="blocks-bg">
        <div className="container">
          <p className="blocks-title">Accounts</p>
          <AccountsTable />
        </div>
      </div>
    </div>
  );
}
