const moment = require("moment-timezone");

let moment_current_date = moment.tz("Asia/kolkata")
const dt_str = `${moment_current_date.month()+1}-${moment_current_date.date()}-${moment_current_date.year()}`


const current_date = new Date(dt_str).getTime()
const discount_start_date = new Date("2024-07-03T18:30:00.302Z")
const discount_end_date = new Date("2024-07-03T18:30:00.302Z")

const start_date = new Date(`${discount_start_date.getMonth()+1}-${discount_start_date.getDate()}-${discount_start_date.getFullYear()}`).getTime()
const end_date = new Date(`${discount_end_date.getMonth()+1}-${discount_end_date.getDate()}-${discount_end_date.getFullYear()}`).getTime()

// if(start_date == end_date) console.log("same start and end");
// if(start_date == end_date && end_date == current_date) console.log("same all dates");

// console.log(current_date,start_date,end_date);

if((start_date<=current_date) && (current_date<=end_date)){
    console.log(true);
}else{
    console.log(false);
}