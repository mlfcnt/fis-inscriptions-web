import {NextResponse} from "next/server";
import {Resend} from "resend";
import {db} from "@/app/db/inscriptionsDB";
import {inscriptions} from "@/drizzle/schemaInscriptions";
import {eq} from "drizzle-orm";
import {format} from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    console.log("Starting PDF email send process...");

    // On attend un formData (multipart)
    const formData = await request.formData();
    const pdfFile = formData.get("pdf");
    const toRaw = formData.get("to");
    const inscriptionId = formData.get("inscriptionId") as string | null;
    const subject = formData.get("subject") as string | null;
    const gender = formData.get("gender") as string | null;

    console.log("Received form data:", {
      hasPdfFile: !!pdfFile,
      toRaw,
      inscriptionId,
      subject,
      gender,
    });

    if (!pdfFile || !toRaw || !inscriptionId || !subject) {
      console.log("Missing required fields");
      return NextResponse.json(
        {error: "Missing required fields: pdf, to, inscriptionId, subject"},
        {status: 400}
      );
    }

    // toRaw est un JSON.stringify d'un array
    let to: string[] = [];
    try {
      to = JSON.parse(toRaw as string);
      console.log("Parsed recipients:", to);
    } catch (error) {
      console.error("Error parsing recipients:", error);
      return NextResponse.json(
        {error: "Invalid 'to' field: must be a JSON array of emails."},
        {status: 400}
      );
    }

    // Récupérer les informations de l'inscription depuis la base de données
    const inscription = await db
      .select()
      .from(inscriptions)
      .where(eq(inscriptions.id, Number(inscriptionId)))
      .limit(1);

    if (!inscription.length) {
      console.log("Inscription not found:", inscriptionId);
      return NextResponse.json({error: "Inscription not found"}, {status: 404});
    }

    const eventData = inscription[0].eventData;

    // pdfFile est un Blob (File)
    const arrayBuffer = await (pdfFile as Blob).arrayBuffer();
    const pdfAsBuffer = Buffer.from(arrayBuffer);

    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      "Inscriptions FIS Etranger <noreply@inscriptions-fis-etranger.fr>";

    console.log("Sending email to:", to);
    console.log("From address:", fromAddress);

    // Construction du sujet au format demandé
    // Ex: French 🇫🇷 MEN entries for 11-12 Apr 25 ➞ Prali (ITA)-FIS
    const isMen = gender === "M";
    const isWomen = gender === "W";
    // Format date courte type '11-12 Apr 25'
    const formatShortDate = (start: Date, end: Date) => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const startD = new Date(start);
      const endD = new Date(end);
      const sameMonth = startD.getMonth() === endD.getMonth();
      const sameYear = startD.getFullYear() === endD.getFullYear();
      const yearStr = String(endD.getFullYear()).slice(-2);
      if (sameMonth && sameYear) {
        return `${startD.getDate()}-${endD.getDate()} ${months[endD.getMonth()]} ${yearStr}`;
      } else {
        // fallback: full dates
        return `${format(startD, "dd/MM/yyyy")}-${format(endD, "dd/MM/yyyy")}`;
      }
    };
    const shortDate = formatShortDate(
      new Date(eventData.startDate),
      new Date(eventData.endDate)
    );
    const place = eventData.place || "";
    const nation = eventData.placeNationCode
      ? `(${eventData.placeNationCode})`
      : "";
    const subjectGender = isMen ? "MEN" : isWomen ? "WOMEN" : "TEAM";
    const subjectLine =
      `French 🇫🇷 ${subjectGender} entries for ${shortDate} ➞ ${place} ${nation}-FIS`
        .replace(/ +/g, " ")
        .replace(" ()", "")
        .trim();

    console.log("Subject:", subjectLine);

    const {data, error: emailError} = await resend.emails.send({
      from: fromAddress,
      to: to,
      subject: subjectLine,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f6f7; padding: 24px; color: #222;">
          <p style="font-size: 18px; margin-bottom: 18px;">Dear Ski Friend,</p>
          <p style="font-size: 16px; margin-bottom: 18px;">
            Please find attached the French 🇫🇷 <b><i>${subjectGender}</i></b> Team entries for the following races:
          </p>
          <ul style="margin-bottom: 18px;">
            <li style="font-size: 16px;">
              <a style="color: #1976d2; text-decoration: underline;" href="https://www.inscriptions-fis-etranger.fr/inscriptions/${inscriptionId}">${shortDate}</a>
              ➞ ${place} ${nation}-FIS
            </li>
          </ul>
          <p style="font-size: 16px; margin-bottom: 18px;">
            We kindly ask you to <b><a style="color: #1976d2; text-decoration: underline;" href="mailto:${to.join(",")}?subject=Re:%20${encodeURIComponent(subjectLine)}">reply to all</a></b> to confirm receipt, or if you need to provide us with any information or the program.
          </p>
          <p style="font-size: 16px; margin-bottom: 18px;">
            We wish you great races, and please feel free to contact me at <a href="mailto:pmartin@ffs.fr" style="color: #1976d2; text-decoration: underline;">pmartin@ffs.fr</a> if you have any questions.
          </p>
          <p style="font-size: 16px;">Best regards.</p>
          <div style="text-align: center; margin-top: 32px;">
            <img src="https://i.imgur.com/tSwmL0f.png" alt="French Team Email Signature" style="max-width: 320px; width: 100%; height: auto; display: inline-block;" />
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `${shortDate} ➞ ${place} ${nation}-FIS-${subjectGender}.pdf`
            .replace(/ +/g, " ")
            .replace(" ()", "")
            .trim(),
          content: pdfAsBuffer,
        },
      ],
    });

    if (emailError) {
      console.error("Email sending error:", emailError);
      return NextResponse.json(
        {error: "Failed to send email", details: emailError},
        {status: 500}
      );
    }

    console.log("Email sent successfully:", data?.id);
    
    // Update inscription status to "email_sent"
    try {
      await db
        .update(inscriptions)
        .set({status: "email_sent"})
        .where(eq(inscriptions.id, Number(inscriptionId)));
      console.log("Inscription status updated to 'email_sent'");
    } catch (statusError) {
      console.error("Failed to update inscription status:", statusError);
      // Don't fail the request if status update fails, email was sent successfully
    }
    
    return NextResponse.json({
      message: "Email sent successfully!",
      emailId: data?.id,
    });
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {error: "Failed to process request", details: (error as Error).message},
      {status: 500}
    );
  }
}
