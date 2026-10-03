import zipfile
import os

def create_docx(filename):
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

    styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="334155"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr>
      <w:spacing w:before="240" w:after="120"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="48"/>
      <w:color w:val="1E1B4B"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:pPr>
      <w:spacing w:after="360"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="24"/>
      <w:color w:val="4F46E5"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:spacing w:before="360" w:after="140"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="12" w:space="4" w:color="4F46E5"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="32"/>
      <w:color w:val="1E293B"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr>
      <w:spacing w:before="240" w:after="100"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="26"/>
      <w:color w:val="4338CA"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr>
      <w:spacing w:before="180" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="22"/>
      <w:color w:val="0F172A"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/>
    <w:pPr>
      <w:spacing w:before="40" w:after="80"/>
      <w:ind w:left="480" w:hanging="240"/>
    </w:pPr>
    <w:rPr>
      <w:sz w:val="21"/>
      <w:color w:val="334155"/>
    </w:rPr>
  </w:style>
</w:styles>"""

    # Helper functions to build WordprocessingML
    def p(text="", style=None, bold=False, italic=False, color=None, size=None, align=None, after=None):
        pPr = ""
        if style:
            pPr += f'<w:pStyle w:val="{style}"/>'
        if align:
            pPr += f'<w:jc w:val="{align}"/>'
        if after is not None:
            pPr += f'<w:spacing w:after="{after}"/>'
        if pPr:
            pPr = f"<w:pPr>{pPr}</w:pPr>"

        if not text:
            return f"<w:p>{pPr}</w:p>"

        rPr = ""
        if bold:
            rPr += "<w:b/>"
        if italic:
            rPr += "<w:i/>"
        if color:
            rPr += f'<w:color w:val="{color}"/>'
        if size:
            rPr += f'<w:sz w:val="{size}"/>'
        if rPr:
            rPr = f"<w:rPr>{rPr}</w:rPr>"

        # Escape XML entities
        safe_text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        return f"<w:p>{pPr}<w:r>{rPr}<w:t xml:space=\"preserve\">{safe_text}</w:t></w:r></w:p>"

    def bullet(bold_prefix, text):
        safe_prefix = bold_prefix.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        safe_text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        return f"""<w:p>
          <w:pPr>
            <w:pStyle w:val="ListBullet"/>
          </w:pPr>
          <w:r>
            <w:rPr><w:b/><w:color w:val="4F46E5"/></w:rPr>
            <w:t xml:space="preserve">• </w:t>
          </w:r>
          <w:r>
            <w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr>
            <w:t xml:space="preserve">{safe_prefix}: </w:t>
          </w:r>
          <w:r>
            <w:rPr><w:color w:val="334155"/></w:rPr>
            <w:t xml:space="preserve">{safe_text}</w:t>
          </w:r>
        </w:p>"""

    def table(rows_data, col_widths, bg_header="F1F5F9"):
        xml = ['<w:tbl>',
               '<w:tblPr>',
               '<w:tblW w:w="0" w:type="auto"/>',
               '<w:tblBorders>',
               '<w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>',
               '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>',
               '<w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>',
               '<w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>',
               '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>',
               '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>',
               '</w:tblBorders>',
               '<w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="180" w:type="dxa"/><w:right w:w="180" w:type="dxa"/></w:tblCellMar>',
               '</w:tblPr>']

        # Column grid
        xml.append('<w:tblGrid>')
        for w in col_widths:
            xml.append(f'<w:gridCol w:w="{w}"/>')
        xml.append('</w:tblGrid>')

        for r_idx, row in enumerate(rows_data):
            xml.append('<w:tr>')
            for c_idx, cell in enumerate(row):
                w = col_widths[c_idx] if c_idx < len(col_widths) else 2000
                is_header = (r_idx == 0)
                shd = f'<w:shd w:val="clear" w:color="auto" w:fill="{bg_header}"/>' if is_header else ''
                bold_attr = '<w:b/>' if is_header else ''
                txt_color = '1E293B' if is_header else '334155'
                safe_txt = str(cell).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

                xml.append(f'''<w:tc>
                  <w:tcPr>
                    <w:tcW w:w="{w}" w:type="dxa"/>
                    {shd}
                    <w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="180" w:type="dxa"/><w:right w:w="180" w:type="dxa"/></w:tcMar>
                  </w:tcPr>
                  <w:p>
                    <w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
                    <w:r>
                      <w:rPr>{bold_attr}<w:sz w:val="20"/><w:color w:val="{txt_color}"/></w:rPr>
                      <w:t xml:space="preserve">{safe_txt}</w:t>
                    </w:r>
                  </w:p>
                </w:tc>''')
            xml.append('</w:tr>')

        xml.append('</w:tbl>')
        return "".join(xml)

    # Build document body
    body_parts = []

    # Title & Subtitle Banner
    body_parts.append(p("QR CODE GENERATOR & MANAGEMENT PLATFORM", style="Title", bold=True))
    body_parts.append(p("Internship Project Task Final Submission Report", style="Subtitle"))
    body_parts.append(p())

    # Metadata Summary Box Table
    meta_rows = [
        ["Project Attribute", "Project Details / Information"],
        ["Candidate / Intern Name", "Ritesh Rathva"],
        ["Role / Track", "Full-Stack Web Development Intern"],
        ["Project Title", "QR Code Generator, Customization & Analytics Platform"],
        ["GitHub Repository", "https://github.com/itzritesh/QR-Code-Generator-Manager"],
        ["Frontend Live Deployment", "https://qr-code-generator-manager-beta.vercel.app"],
        ["Backend Hosting / API", "Render Web Service (Node.js / Express / TypeScript)"],
        ["Database Infrastructure", "Neon Serverless PostgreSQL (Cloud-Hosted with Connection Pooling)"],
        ["Submission Date", "October 2024"],
        ["Project Status", "100% Completed, Fully Tested & Deployed to Production"]
    ]
    body_parts.append(table(meta_rows, [3000, 6200], bg_header="EEF2FF"))
    body_parts.append(p(after=240))

    # 1. Executive Summary
    body_parts.append(p("1. Executive Summary", style="Heading1"))
    body_parts.append(p(
        "The QR Code Generator & Management Platform is a production-grade, enterprise-ready SaaS application designed "
        "to empower businesses and individual users to create, customize, track, and manage both Static and Dynamic QR codes. "
        "Unlike generic QR generation utilities, this platform bridges the gap between high-fidelity visual design studio capabilities "
        "and real-time data analytics, complete with secure authentication, multi-type payload routing (URL, Plain Text, Wi-Fi, and UPI Payments), "
        "bulk processing capabilities, and enterprise-grade cloud hosting."
    ))

    # 2. Technology Stack & Architecture
    body_parts.append(p("2. Technology Stack & System Architecture", style="Heading1"))
    body_parts.append(p(
        "The project follows a modern client-server architectural pattern with strict type safety across the entire codebase."
    ))

    stack_rows = [
        ["Layer / Component", "Technologies & Libraries", "Architectural Role"],
        ["Frontend UI / Client", "React 18, TypeScript, Vite, Tailwind CSS", "Responsive SPA with modern SaaS aesthetic & zero layout lag"],
        ["Design & Icons", "Lucide React, React Icons, Google Plus Jakarta Sans", "Premium visual design, typography, and SVG vector icons"],
        ["QR Rendering Engine", "qrcode, HTML5 Canvas API, SVG DOM", "Pixel-perfect client-side real-time rendering, ECC calculations, vector export"],
        ["Backend API Server", "Node.js, Express, TypeScript (TSX/ESM)", "RESTful endpoints, secure shortlink redirects, route validators"],
        ["Database & ORM", "PostgreSQL (Neon Serverless), Prisma ORM 5.17", "Relational models, relational indexes, transactions, schema migrations"],
        ["Security & Auth", "JWT (Access & Refresh), Bcrypt.js, Helmet, Rate-Limit", "Protected endpoints, XSS protection, anti-bruteforce security"],
        ["Bulk Processing", "JSZip, Custom RFC 4180 CSV Parser", "Batch generation of up to 100 QR codes with ZIP archive download"],
        ["Cloud Hosting", "Vercel (Frontend), Render (Backend), Neon (DB)", "CI/CD automated continuous deployment pipeline"]
    ]
    body_parts.append(table(stack_rows, [2200, 3600, 3400], bg_header="F8FAFC"))
    body_parts.append(p(after=200))

    # 3. Core Modules & Accomplishments
    body_parts.append(p("3. Core Modules & Implementation Highlights", style="Heading1"))

    body_parts.append(p("3.1 Secure Authentication & User Identity Management", style="Heading2"))
    body_parts.append(bullet("Enterprise Authentication", "Implemented JWT-based authentication with dual access tokens (15m) and secure refresh tokens (7d)."))
    body_parts.append(bullet("Password Hashing", "Bcrypt hashing with salt rounds of 10 for secure credential storage."))
    body_parts.append(bullet("Role-Based Data Isolation", "Strict tenant-level row isolation where every user can only view, edit, or delete their own QR codes."))

    body_parts.append(p("3.2 Dynamic QR Engine for All Content Types", style="Heading2"))
    body_parts.append(p(
        "A major breakthrough accomplished in this project was enabling Dynamic QR tracking not just for URLs, "
        "but also for Plain Text, Wi-Fi Networks, and UPI Payments:"
    ))
    body_parts.append(bullet("Website URL", "Scans route via shortcode (/q/:shortCode) and safely execute an HTTP 302 redirect to the destination."))
    body_parts.append(bullet("Plain Text", "Renders a sleek, mobile-optimized card with formatted text display and a 1-tap 'Copy Text' clipboard action."))
    body_parts.append(bullet("Wi-Fi Network", "Renders a secure Wi-Fi credential card with network SSID, security badge, and 1-tap 'Copy Wi-Fi Password' button."))
    body_parts.append(bullet("UPI / Payments", "Displays verified payee, amount in INR, 1-tap 'Pay via UPI App' (auto-triggers Google Pay, PhonePe, Paytm, or BHIM), and 'Copy UPI ID'."))
    body_parts.append(bullet("Scan Counting & Analytics", "Scanning ANY of these dynamic QR codes increments the database scanCount and writes visitor telemetry (Device, OS, Browser, Country)."))

    body_parts.append(p("3.3 Customization Studio & Sticky Live Preview", style="Heading2"))
    body_parts.append(bullet("Real-Time Canvas Updates", "Immediate visual synchronization on canvas when modifying templates, colors, or corner eyes."))
    body_parts.append(bullet("Design Presets & Templates", "Built-in templates including Corporate Executive, Modern Gradient, Clean Minimalist, and Organic Rounded."))
    body_parts.append(bullet("Corner Eyes & Dot Styles", "Custom shapes including Square, Rounded, Dots, and Classy dot styles with independent inner eyeball colors."))
    body_parts.append(bullet("Logo Integration", "Embedded logo upload with automatic Error Correction Level H (30% recovery) to guarantee 100% scannability."))
    body_parts.append(bullet("Sticky Studio Architecture", "Ultra-compact preview card locked to top-4 (16px) with an accordion drawer, ensuring the QR code remains in view during customization without scrolling."))
    body_parts.append(bullet("Vector & High-Resolution Export", "Supports instant download in PNG, SVG (scalable vector), and PDF formats."))

    body_parts.append(p("3.4 Comprehensive Analytics Dashboard", style="Heading2"))
    body_parts.append(bullet("Aggregated KPIs", "Total Scans, Unique Visitors, Active vs Disabled Codes, and Average Scans per Code."))
    body_parts.append(bullet("Device & OS Breakdown", "Visual distribution charts distinguishing Mobile, Desktop, and Tablet scans, plus OS stats (iOS, Android, Windows)."))
    body_parts.append(bullet("Browser & Geolocation", "User agent parsing for Chrome, Safari, Firefox, Edge, and visitor country tracking."))

    body_parts.append(p("3.5 Batch Processing (Bulk QR Generator)", style="Heading2"))
    body_parts.append(bullet("RFC 4180 CSV Ingestion", "Upload CSV files supporting quotes, commas, and newlines."))
    body_parts.append(bullet("Batch Validation Engine", "Real-time pre-validation detecting duplicate entries, invalid UPI formats, and malformed URLs."))
    body_parts.append(bullet("ZIP Archive Compilation", "Generates high-resolution images for each valid row and delivers a consolidated ZIP archive containing a README manifest."))

    # 4. Challenges Faced & Technical Solutions
    body_parts.append(p("4. Technical Challenges & Engineering Solutions", style="Heading1"))

    challenge_rows = [
        ["Technical Challenge", "Root Cause Analysis", "Engineered Solution"],
        [
            "Dynamic QR for Non-URL Types (Text, Wi-Fi, Payment)",
            "Traditional static QR codes encode protocols (WIFI:, upi:) directly into the bitmap, making scan counting impossible without server routing.",
            "Engineered dynamic shortcodes (/q/:shortCode) that log scan telemetry to Neon DB first, then render lightweight, responsive HTML mobile landing cards with 1-tap protocol intents."
        ],
        [
            "Studio Preview Disappearing While Scrolling",
            "CSS Grid container had items-start and ancestor had overflow-hidden, which terminated the sticky runway and pushed the QR canvas out of viewport.",
            "Refactored AppLayout to a true h-screen app container with fixed navbar, allowed CSS Grid columns to stretch to 100% height, and nested the sticky container."
        ],
        [
            "Strict URL Validator Breaking Non-URL Payloads",
            "Backend Zod validation schema strictly tested destinationUrl with urlValidator (enforcing http/https), causing 400 Bad Request on plain text and UPI strings.",
            "Updated createQrSchema and updateQrSchema to allow string destinationUrl while reserving strict URL validation specifically for type === 'URL' via refined validators."
        ],
        [
            "TypeScript Build Failure on Cloud Deployment (Render)",
            "In-memory dynamic lookup cache (dynamicQrCache) was typed without the optional metadata property, triggering TS2339 during tsc production build.",
            "Updated the cache interface to include metadata?: any; and strongly typed dynamic controllers to ensure zero compiler warnings during cloud CI/CD builds."
        ]
    ]
    body_parts.append(table(challenge_rows, [2200, 3400, 3600], bg_header="FEF3C7"))
    body_parts.append(p(after=200))

    # 5. Quality Assurance & Testing Summary
    body_parts.append(p("5. Testing & Quality Assurance", style="Heading1"))
    body_parts.append(p(
        "The application underwent rigorous End-to-End (E2E) testing across all application flows:"
    ))
    body_parts.append(bullet("Authentication Suite", "Validated registration, duplicate email rejection, weak password rejection, token expiration, and unauthorized request shielding."))
    body_parts.append(bullet("Physical Scannability Verification", "Every generated QR code style (Square, Rounded, Dots, Classy) and logo placement was tested using physical iOS (Camera App) and Android (Google Lens / Paytm / PhonePe) scanners."))
    body_parts.append(bullet("Dynamic Redirection Accuracy", "Verified 100% redirection reliability on URL codes and verified 1-tap clipboard and mobile intent triggers on Text, Wi-Fi, and UPI."))
    body_parts.append(bullet("Database Integrity", "Verified atomic database transactions ($transaction) so that every scan event creation is permanently synchronized with the scanCount increment."))

    # 6. Conclusion & Learning Outcomes
    body_parts.append(p("6. Conclusion & Key Learning Outcomes", style="Heading1"))
    body_parts.append(p(
        "This internship task provided hands-on experience in architecting, developing, and deploying a modern SaaS product from end to end. "
        "Key competencies mastered include: building clean RESTful APIs with TypeScript and Express, database modeling and relational migrations with Prisma ORM, "
        "managing serverless PostgreSQL on Neon, implementing complex client-side Canvas and SVG rendering, optimizing CSS Grid and sticky layouts for flawless UI/UX, "
        "and managing production deployments on Vercel and Render."
    ))
    body_parts.append(p(
        "The application is fully operational, publicly accessible, and ready for real-world enterprise utilization."
    ))
    body_parts.append(p(after=300))

    # Sign-off section
    body_parts.append(p("Submitted by: Ritesh Rathva", bold=True, color="1E1B4B"))
    body_parts.append(p("Role: Full-Stack Web Development Intern", italic=True, color="475569"))
    body_parts.append(p("Project: QR Code Generator & Management Platform", color="475569"))

    # Document assembly
    body_xml = "".join(body_parts)
    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body_xml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>"""

    # Create ZIP archive representing .docx
    with zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', rels)
        z.writestr('word/_rels/document.xml.rels', doc_rels)
        z.writestr('word/styles.xml', styles_xml)
        z.writestr('word/document.xml', document_xml)

    print(f"Successfully generated docx: {filename} ({os.path.getsize(filename)} bytes)")

if __name__ == '__main__':
    output_path = os.path.abspath("QR_Code_Platform_Internship_Report.docx")
    create_docx(output_path)
