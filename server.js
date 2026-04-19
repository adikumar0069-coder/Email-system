require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI);

const Ticket = mongoose.model("Ticket", {
  _id: String,
  data: Object
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = 3000;

// TEMP storage
const tickets = {};

// 👇 ADD THIS HERE (top of file, after imports)

function formatDate(dateStr, timeStr) {
  const d = new Date(`${dateStr}T${timeStr}`);

  const options = { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'long' 
  };

  const datePart = d.toLocaleDateString('en-IN', options);
  const timePart = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${datePart} | ${timePart}`;
}

// TEMPLATE FUNCTION

function generateTemplate(data, id, theme) {
  const color = theme === "purple" ? "#6C3BFF" : "#F84464";
  const formattedDate = formatDate(data.date, data.time);

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="background:#f4f4f4;padding:30px 12px;font-family:Arial,sans-serif">

<tr>
<td align="center">

<table width="420" cellpadding="0" cellspacing="0" border="0"
style="max-width:420px;background:#ffffff;border-radius:22px;overflow:hidden">

<!-- TOP -->
<tr>
<td style="padding:18px">

<table width="100%">
<tr>

<!-- IMAGE -->
<td width="90" valign="top">
<img src="${data.image}"
style="width:78px;height:108px;border-radius:12px;display:block;object-fit:cover">
</td>

<!-- TEXT -->
<td valign="top">

<div style="font-size:18px;font-weight:700;color:#222;line-height:1.4">
${data.matchName}
</div>

<div style="font-size:14px;color:#666;margin-top:5px">
Cricket | English
</div>

<div style="font-size:16px;font-weight:bold;color:#333;margin-top:14px">
${formattedDate}
</div>

<div style="font-size:14px;color:#777;margin-top:6px">
${data.stadium}
</div>

<div style="font-size:15px;font-weight:bold;color:#333;margin-top:6px">
${data.tickets} ticket(s): ${data.stand}
</div>

</td>

</tr>
</table>

</td>
</tr>

<!-- CONFIRMATION -->
<tr>
<td style="border-top:1px solid #e5e5e5;padding:14px 16px;text-align:center">

<span style="
background:#0aa52f;
color:#fff;
font-weight:bold;
padding:12px 22px;
border-radius:4px;
font-size:14px;
display:inline-block;">
CONFIRMED
</span>

<span style="margin-left:12px;color:#666;font-size:15px">
Enjoy the match!
</span>

</td>
</tr>

<!-- BUTTON -->
<tr>
<td style="padding:16px;border-top:2px dotted #ddd">

<a href="http://YOUR-IP:3000/ticket/${id}"
style="
display:block;
text-align:center;
background:${color};
color:#fff;
text-decoration:none;
padding:14px;
border-radius:10px;
font-size:15px;
font-weight:bold;">
View Details
</a>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="border-top:1px solid #e5e5e5;padding:16px;font-size:14px;color:#555">

<table width="100%">
<tr>
<td width="50%" align="center">
Re-send confirmation
</td>
<td width="50%" align="center" style="color:#999">
Cancellation unavailable for Live Events
</td>
</tr>
</table>

</td>
</tr>

</table>

</td>
</tr>
</table>
`;
}

// SEND EMAIL
app.post("/send-email", async (req, res) => {
  const { to, data, theme } = req.body;

  if (!to) return res.status(400).json({ error: "Email required" });

  const id = uuidv4();
  await Ticket.create({ _id: id, data});

  const html = generateTemplate(data, id, theme);

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          email: process.env.SENDER_EMAIL,
          name: "Ticket System"
        },
        to: [{ email: to }],
        subject: "Booking Confirmed",
        htmlContent: html
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ success: true, link: `http://localhost:3000/ticket/${id}` });

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ error: "Email failed" });
  }
});

// LANDING PAGE
app.get("/ticket/:id", async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.send("Invalid ticket");

  const data = ticket.data;

  const formattedDate = formatDate(data.date, data.time);

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body{
    margin:0;
    padding:20px;
    background:#f3f3f3;
    font-family:Arial;
}

.ticket-wrapper{
    max-width:380px;
    margin:auto;
    position:relative;
}

.match-card{
    background:white;
    border-radius:18px;
    padding:14px;
    display:flex;
    align-items:flex-start;
    gap:12px;
    box-shadow:0 2px 10px rgba(0,0,0,0.08);
}

.match-left img{
    width:75px;
    height:105px;
    border-radius:10px;
    object-fit:cover;
}

.match-info h3{
    font-size:15px;
    margin:0 0 5px;
    font-weight:700;
}

.match-info p{
    font-size:12px;
    margin:2px 0;
    color:#666;
}

.ticket-label{
    writing-mode:vertical-rl;
    font-size:11px;
    color:#888;
    margin-left:auto;
}

.toggle-btn{
    width:100%;
    margin:14px 0;
    border:none;
    padding:13px;
    border-radius:30px;
    background:#e9e6e6;
    font-size:14px;
    font-weight:600;
    cursor:pointer;
}

.ticket-box{
    background:white;
    border-radius:18px;
    padding:15px;
    border:1px solid #eee;
    position:relative;
}

.ticket-box::before,
.ticket-box::after{
    content:'';
    position:absolute;
    width:22px;
    height:22px;
    background:#f3f3f3;
    border-radius:50%;
    top:55%;
    transform:translateY(-50%);
}

.ticket-box::before{ left:-11px; }
.ticket-box::after{ right:-11px; }

.ticket-box hr{
    border:none;
    border-top:2px dotted #ddd;
    margin:18px 0;
}

.stand-title{
    text-align:center;
    font-size:12px;
    font-weight:bold;
    color:#666;
    margin-bottom:15px;
}

.qr-section{
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:20px;
}

.arrow-btn{
    width:30px;
    height:30px;
    border:none;
    border-radius:8px;
    background:#efefef;
    font-size:18px;
    color:#999;
}

.qr-box{
    position:relative;
    width:180px;
    margin:auto;
    text-align:center;
}

.qr-box img{
    width:100%;
    opacity:0.15;
}

.qr-overlay{
    position:absolute;
    inset:0;
    background:white;
    display:flex;
    align-items:center;
    justify-content:center;
    text-align:center;
    padding:15px;
}

.qr-overlay p{
    font-size:14px;
    font-weight:bold;
    color:#1f2d7a;
    line-height:1.5;
}

.ticket-details{
    background:#fafafa;
    border-radius:14px;
    padding:12px;
}

.row{
    display:flex;
    justify-content:space-between;
    margin-bottom:10px;
    font-size:12px;
}

.row span{ color:#999; }

.row strong{
    max-width:55%;
    text-align:right;
    font-weight:600;
}

.cancel-note{
    text-align:center;
    font-size:11px;
    color:#888;
    margin:15px 0;
}

.price-box{
    background:white;
    border-radius:14px;
    padding:15px;
    box-shadow:0 2px 10px rgba(0,0,0,0.06);
    position:relative;
}

.price-box::before,
.price-box::after{
    content:'';
    position:absolute;
    width:22px;
    height:22px;
    background:#f3f3f3;
    border-radius:50%;
    top:-11px;
}

.price-box::before{ left:-11px; }
.price-box::after{ right:-11px; }

.price-row{
    display:flex;
    justify-content:space-between;
    font-size:12px;
    margin-bottom:8px;
}
</style>
</head>

<body>

<div class="ticket-wrapper">

<!-- MATCH CARD -->
<div class="match-card">
    <div class="match-left">
        <img src="${data.image}">
    </div>

    <div class="match-info">
        <h3>${data.matchName}</h3>
        <p>Cricket | English</p>
        <p>${formattedDate}</p>
        <p>${data.stadium}</p>
    </div>

    <div class="ticket-label">M-Ticket</div>
</div>

<button class="toggle-btn" onclick="toggleTicket()">View Details</button>

<div id="ticketDetails" style="display:none;">

    <div class="ticket-box">

        <div class="stand-title">
            ${data.stand}
        </div>

        <div class="qr-section">

            <button class="arrow-btn">&#10094;</button>

            <div class="qr-box">

                <div class="qr-overlay">
                    <p>QR will be visible before match starts</p>
                </div>

                <!-- STATIC QR -->
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data.id}">
            </div>

            <button class="arrow-btn">&#10095;</button>

        </div>

        <hr>

        <div class="ticket-details">
            <div class="row">
                <span>Gate</span>
                <strong>${data.gate || "Main Gate"}</strong>
            </div>

            <div class="row">
                <span>Level</span>
                <strong>${data.level || "1"}</strong>
            </div>

            <div class="row">
                <span>Seat</span>
                <strong>${data.seat || "Auto Assigned"}</strong>
            </div>
        </div>

    </div>

    <p class="cancel-note">Cancellation unavailable for Live Events</p>

    <div class="price-box">
        <div class="price-row">
            <span>Total</span>
            <strong>₹${data.total}</strong>
        </div>

        <div class="price-row">
            <span>Tickets</span>
            <strong>₹${data.price}</strong>
        </div>

        <div class="price-row">
            <span>Fees</span>
            <strong>₹${data.fees}</strong>
        </div>
    </div>

</div>

</div>

<script>
function toggleTicket(){
    let details = document.getElementById("ticketDetails");
    let btn = document.querySelector(".toggle-btn");

    if(details.style.display === "none"){
        details.style.display = "block";
        btn.innerText = "Tap to hide details";
    }else{
        details.style.display = "none";
        btn.innerText = "View Details";
    }
}
</script>

</body>
</html>
`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});