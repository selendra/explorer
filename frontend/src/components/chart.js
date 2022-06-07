// // import React from "react";
// // import { Pie } from "@ant-design/plots";
// // const Chart = () => {
// //   const datas = [
// //     {
// //       type: "ActiveEra",
// //       value: 27,
// //     },
// //     {
// //       type: "CurrentEra",
// //       value: 27,
// //     },
// //   ];
// //   var config = {
// //     appendPadding: 10,

// //     data: datas,
// //     angleField: "value",
// //     colorField: "type",
// //     radius: 1,
// //     innerRadius: 0.6,
// //     legend: {
// //       position: "top",
// //     },
// //     label: {
// //       type: "inner",
// //       offset: "-50%",
// //       content: "{value}",
// //       style: {
// //         textAlign: "center",
// //         fontSize: 16,
// //       },
// //     },
// //     interactions: [{ type: "element-selected" }, { type: "element-active" }],
// //     statistic: {
// //       title: false,
// //       content: {
// //         style: {
// //           whiteSpace: "pre-wrap",
// //           overflow: "hidden",
// //           textOverflow: "ellipsis",
// //         },
// //         // formatter: function formatter() {
// //         //   return 500;
// //         // },
// //       },
// //     },
// //   };
// //   return (
// //     <div>
// //       <Pie {...config} />
// //     </div>
// //   );
// // };

// // export default Chart;

// import React from "react";
// import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
// import { Doughnut } from "react-chartjs-2";

// const Chart = ({ dataEra, datacurrentEra }) => {
//   const datas = {
//     labels: ["Ended", "Active"],
//     color: "white",
//     title: {
//       display: true,
//       text: "Chart.js Pie Chart",
//       color: "white",
//     },
//     hoverOffset: 4,
//     color: "white",
//     datasets: [
//       {
//         label: "Era",
//         color: "white",
//         data: [datacurrentEra, dataEra],
//         backgroundColor: ["#ED1576", "#03A9F4"],
//         borderColor: ["rgb(1, 76, 110)", "rgb(1, 76, 110)"],
//         borderWidth: 5,
//       },
//     ],
//   };
//   ChartJS.register(ArcElement, Tooltip, Legend);
//   return (
//     <div>
//       <center>Eras</center>
//       <Doughnut
//         style={{
//           height: "200px !important",
//           width: "200px !important",
//           color: "white !important",
//         }}
//         data={datas}
//       />
//     </div>
//   );
// };

// export default Chart;

import React from "react";
import { Pie, measureTextWidth } from "@ant-design/plots";
const Chart = ({ dataEra, datacurrentEra }) => {
  const data = [
    {
      type: "Active",
      value: datacurrentEra,
      color: "blue",
    },
    {
      type: "Ended",
      value: dataEra,
      color: "red",
    },
  ];
  const config = {
    appendPadding: 10,
    data,
    legend: false,
    fill: "red",
    color: ["#ED1576", "#03A9F4"],
    border: "1px solid blakc",
    // legend: { position: "top" },
    angleField: "value",
    colorField: "type",
    radius: 1,
    innerRadius: 0.6,
    label: {
      type: "inner",
      offset: "-50%",
      content: "{value}",
      style: {
        textAlign: "center",
        fontSize: 14,
      },
    },
    interactions: [
      {
        type: "element-selected",
      },
      {
        type: "element-active",
      },
    ],
    statistic: {
      title: false,
      content: {
        style: {
          whiteSpace: "pre-wrap",
          color: "white",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontSize: "20px",
        },
        content: "Eras",
      },
    },
  };
  return <Pie style={{ width: "200px", height: "200px" }} {...config} />;
};

export default Chart;
