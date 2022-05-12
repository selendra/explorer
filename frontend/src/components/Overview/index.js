import { Row } from "antd";
import DataField from "./DataField";

export default function Overview(props) {
  return (
    <div className="home-all-data">
      <Row justify="center" align="middle" gutter={[32, 32]}>
        <DataField icon='/assets/icons/box.svg' title='Last Blocks' data={props.total_blocks} />
        <DataField icon='/assets/icons/box-tick.svg' title='Finalized' data={props.total_blocksFinalized} />
        <DataField icon='/assets/icons/edit.svg' title='Signed Extrinsics' data={new Intl.NumberFormat().format(props.total_extrinsicSigned)} />
        <DataField icon='/assets/icons/user-square.svg' title='Accounts' data={new Intl.NumberFormat().format(props.total_accounts)} />
        <DataField icon='/assets/icons/arrow-swap-horizontal.svg' title='Total Transfer' data={new Intl.NumberFormat().format(props.total_transfers)} />
        <DataField icon='/assets/icons/validator-white.svg' title='Validators' data={new Intl.NumberFormat().format(props.total_validators)} />
        <DataField icon='/assets/icons/profile-2user.svg' title='SEL Native Issued' data={new Intl.NumberFormat().format(props.total_issuance)} />
        <DataField icon='/assets/icons/box-time.svg' title='Staking' data={new Intl.NumberFormat().format(props.total_staking)} />
        <DataField icon='/assets/icons/box-time.svg' title='Vesting' data={new Intl.NumberFormat().format(props.total_staking)} />
        
      </Row>
    </div>
  );
}


