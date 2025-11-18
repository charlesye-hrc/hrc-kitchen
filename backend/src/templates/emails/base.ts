// Base email template with common styling

export const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333333;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }
  .card {
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 32px;
    margin: 20px 0;
  }
  .header {
    text-align: center;
    padding-bottom: 24px;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 24px;
  }
  .logo {
    font-size: 24px;
    font-weight: bold;
    color: #1976d2;
  }
  .content {
    padding: 16px 0;
  }
  .footer {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid #e0e0e0;
    margin-top: 24px;
    font-size: 12px;
    color: #666666;
  }
  h1 {
    color: #1976d2;
    font-size: 24px;
    margin: 0 0 16px 0;
  }
  h2 {
    color: #333333;
    font-size: 18px;
    margin: 16px 0 8px 0;
  }
  p {
    margin: 0 0 16px 0;
  }
  .button {
    display: inline-block;
    padding: 12px 24px;
    background-color: #1976d2;
    color: #ffffff !important;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 500;
    margin: 16px 0;
  }
  .button:hover {
    background-color: #1565c0;
  }
  .button-container {
    text-align: center;
    margin: 24px 0;
  }
  .info-box {
    background-color: #e3f2fd;
    border-left: 4px solid #1976d2;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 0 4px 4px 0;
  }
  .warning-box {
    background-color: #fff3e0;
    border-left: 4px solid #ff9800;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 0 4px 4px 0;
  }
  .muted {
    color: #666666;
    font-size: 14px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }
  th, td {
    text-align: left;
    padding: 8px;
    border-bottom: 1px solid #e0e0e0;
  }
  th {
    background-color: #f5f5f5;
    font-weight: 600;
  }
  .total-row {
    font-weight: bold;
    font-size: 16px;
  }
  .total-row td {
    border-top: 2px solid #1976d2;
    padding-top: 12px;
  }
`;

export function wrapInBaseTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">HRC Kitchen</div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>This email was sent by HRC Kitchen</p>
        <p>Huon Regional Care</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
