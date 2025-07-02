var aws = require('aws-sdk');
var ses = new aws.SES({region: 'ap-southeast-2'});
var s3 = new aws.S3();

// This Lambda function sends an email using AWS SES with optional attachments.
// It retrieves the email body, subject, and recipient information from the event object.   
// The email body is formatted using a general template that includes a signature and logo.
// If attachments are provided, it retrieves them from an S3 bucket and attaches them   
var nodemailer = require("nodemailer");


// The Lambda function handler is the entry point for the Lambda function.
// It receives an event object containing the email details and returns a response with the result of the   
// email sending operation. The response includes the status code, headers, and body containing the result.
// The function uses the AWS SDK to interact with SES and S3 services.  
exports.handler = async (event) => {

    // Check if the event body is provided
    // If not, return a 400 Bad Request response with an error message. 
    if (!event.body) {
        return {        

            statusCode: 400,
            "headers": {
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({error: "No body provided"})
        };  
    }
    // Parse the event body to retrieve email details
    // The body should contain fields like 'from', 'to', 'cc', 'bcc', 'subject', 'body', and 'attachments'.
    // The 'attachments' field is expected to be an array of objects with 'folder', 'filename', and 'original' properties.
    // The function retrieves the logo and signature from environment variables.    
    var body =JSON.parse (event.body);
    var logo = process.env.LOGO;
    var sign = process.env.SIGN;
    const html = getGeneralTemplate(body.body,sign,logo);
    var mailOptions = {
        from: body.from,
        subject: body.subject,
        html: html,
        to: body.to,
        cc: body.cc,
        bcc: body.bcc
    };
    
    
    // If any required fields are missing, return a 400 Bad Request response with an error message.
    if (!body.from || !body.to || !body.subject || !body.body) {
        return {    

            statusCode: 400,
            "headers": {        

                "Access-Control-Allow-Origin": "*"
            },      
            body: JSON.stringify({error: "Missing required fields: from, to, subject, or body"})
        };
    }

    // Check if the EMAIL_BUCKET environment variable is set
    // If not, return a 500 Internal Server Error response with an error message.   
    // The EMAIL_BUCKET variable is expected to contain the name of the S3 bucket where attachments are stored.
    // This bucket is used to retrieve the attachments specified in the email body. 
    if (!process.env.EMAIL_BUCKET) {
        return {

            statusCode: 500,
            "headers": {        
                "Access-Control-Allow-Origin": "*"
            },

            body: JSON.stringify({error: "EMAIL_BUCKET environment variable is not set"})
        };  
    }
    // If attachments are provided, retrieve them from S3 and add to mail options
    // The attachments are expected to be in the format { folder: 'folder_name', filename: 'file_name' }
    // The function retrieves each attachment from the specified S3 bucket and adds it to the mailOptions.
    // If the attachment retrieval fails, it logs the error but continues processing the email sending.
    // If the attachments are successfully retrieved, they are added to the mailOptions object.
    // The attachments are formatted with the original filename, content, and content type.
    if (!body.attachments) {
        body.attachments = [];
    }

    if (body.attachments && body.attachments.length>0) {
       for (const a of body.attachments) {
           await getS3File(process.env.EMAIL_BUCKET,a.folder+'/'+a.filename).then (data=> a.attachedFile=data,error => console.log(error));
       }
       
       mailOptions.attachments = body.attachments.map(a => ({
           filename: a.original,
           content: a.attachedFile.Body,
           contentType: a.attachedFile.contentType
       }));
    }
    

    var result = {failed:true};
    
    // Send the email using the sendEmail function
    // The function uses nodemailer to create a transporter with AWS SES and sends the email with the provided mail options.
    // If the email is sent successfully, it resolves with the response and includes the HTML content   
    // If there is an error during the email sending, it logs the error but does not reject the promise.
    // The result object is updated with the response from the sendEmail function.  
    // The function returns a response with a status code of 200 and the result of the email sending operation.
    await sendEmail(mailOptions).then((res) => { result = {
        res, html}; }, (err) => { console.log(err); });

        return {
        statusCode: 200,
        "headers": {
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(result)
    };
};

// Function to send an email using AWS SES with the provided mail options.
// It returns a promise that resolves with the email response or rejects with an error. 
async function sendEmail(mailOptions){
    
    return new Promise((resolve,reject)=>{
    // Create a transporter using nodemailer with AWS SES
    // The transporter is configured to use the SES service in the specified region.
    // The mailOptions object contains the email details such as from, to, subject, and body.
    // The function uses the nodemailer library to create a transporter and send the email.
    let transporter = nodemailer.createTransport({SES:ses});

    // Send the email using the transporter.sendMail method
    // The sendMail method takes the mailOptions object and sends the email.    
    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
       reject(error); // or use rejcet(false) but then you will have to handle errors
    } 
   else {
       console.log('Email sent: ' + info.response);
       resolve(info.response);
    }
   });
   });
   }
   

// Function to retrieve a file from S3 bucket
// It returns a promise that resolves with the file data or rejects with an error.  
async function getS3File(bucket, key) {
    return new Promise(function(resolve, reject) {
        s3.getObject(
            {
                Bucket: bucket,
                Key: key
            },
            function (err, data) {
                if (err) return reject(err);
                else return resolve(data);
            }
        );
    });
}   

// Function to generate a general email template with the provided body, signature, and logo.
// The template includes the body text, signature, and a logo image.
function getGeneralTemplate(body,sign,logo) {
    return `
    <html><head></head><body><div>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><SPAN style="mso-ascii-font-family: Calibri; mso-ascii-theme-font: minor-latin; mso-hansi-font-family: Calibri; mso-hansi-theme-font: minor-latin; mso-bidi-font-family: 'Times New Roman'; mso-bidi-theme-font: minor-bidi;FONT-SIZE: 12pt"><FONT face=Calibri>${body}<o:p></o:p></FONT></SPAN></P>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><SPAN style="mso-ascii-font-family: Calibri; mso-ascii-theme-font: minor-latin; mso-hansi-font-family: Calibri; mso-hansi-theme-font: minor-latin; mso-bidi-font-family: 'Times New Roman'; mso-bidi-theme-font: minor-bidi"><o:p><FONT face=Calibri>&nbsp;</FONT></o:p></SPAN></P>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><SPAN style="mso-ascii-font-family: Calibri; mso-ascii-theme-font: minor-latin; mso-hansi-font-family: Calibri; mso-hansi-theme-font: minor-latin; mso-bidi-font-family: 'Times New Roman'; mso-bidi-theme-font: minor-bidi"><o:p><FONT face=Calibri>&nbsp;</FONT></o:p></SPAN></P>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><SPAN style="mso-ascii-font-family: Calibri; mso-ascii-theme-font: minor-latin; mso-hansi-font-family: Calibri; mso-hansi-theme-font: minor-latin; mso-bidi-font-family: 'Times New Roman'; mso-bidi-theme-font: minor-bidi;FONT-SIZE: 12pt"><FONT face=Calibri>${sign}<o:p></o:p></FONT></SPAN></P>
<br/>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><B style="mso-bidi-font-weight: normal"><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: black; FONT-SIZE: 10pt; mso-no-proof: yes"></SPAN></B><img src="${logo}" />
<br/>
<B><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #636363; FONT-SIZE: 10pt; mso-fareast-language: EN-AU"><BR></SPAN></B><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #ff6600; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">•</SPAN><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #bfd630; FONT-SIZE: 10pt; mso-fareast-language: EN-AU"> </SPAN><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #636363; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">t. 08 7111 0680 </SPAN><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #ff6600; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">•</SPAN><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #636363; FONT-SIZE: 10pt; mso-fareast-language: EN-AU"> f. 08 8331 7742 <o:p></o:p></SPAN></P>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #ff6600; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">• </SPAN><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #636363; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">PO Box 569, <o:p></o:p></SPAN></P>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #636363; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">&nbsp;&nbsp;NORTH ADELAIDE SA 5006<o:p></o:p></SPAN></P>
<br/>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><B><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #ff6600; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">Confidentiality</SPAN></B><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #ff6600; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">: <o:p></o:p></SPAN></P>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><B><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: black; FONT-SIZE: 10pt; mso-fareast-language: EN-AU"><o:p>&nbsp;</o:p></SPAN></B></P>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><B><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #ff6600; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">Viruses</SPAN></B><SPAN style="FONT-FAMILY: 'Helvetica','sans-serif'; COLOR: #ff6600; FONT-SIZE: 10pt; mso-fareast-language: EN-AU">: <o:p></o:p></SPAN></P>
<P style="MARGIN: 0cm 0cm 0pt" class=MsoNormal><SPAN style="mso-ascii-font-family: Calibri; mso-ascii-theme-font: minor-latin; mso-hansi-font-family: Calibri; mso-hansi-theme-font: minor-latin; mso-bidi-font-family: 'Times New Roman'; mso-bidi-theme-font: minor-bidi; mso-ansi-language: EN-US" lang=EN-US><o:p><FONT face=Calibri>&nbsp;</FONT></o:p></SPAN></P>
</div></body></html>
`;

}
