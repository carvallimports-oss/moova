// Email HTML templates for Resend

export function welcomeEmail(params: { brokerName: string; loginUrl: string }): { subject: string; html: string } {
  return {
    subject: "Bem-vindo ao Moova — sua Nara está pronta",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E0D8CE;overflow:hidden;">
        <tr><td style="background:#2D4A3E;padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#B87333;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Moova</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:28px;font-weight:normal;">Bem-vindo, ${params.brokerName}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#2D4A3E;font-size:16px;line-height:1.6;">Sua Nara já está configurada e pronta para começar a trabalhar com você.</p>
          <p style="color:#5A5A5A;font-size:15px;line-height:1.7;">Nos próximos 14 dias ela vai mostrar exatamente o que consegue fazer pelo seu negócio — leads qualificados, agendamentos feitos, clientes engajados enquanto você cuida do que só você pode fazer.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr><td align="center">
              <a href="${params.loginUrl}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;">Acessar meu painel</a>
            </td></tr>
          </table>
          <p style="color:#8A8A8A;font-size:13px;line-height:1.6;">Se tiver qualquer dúvida, responda este email. Estamos aqui.</p>
          <hr style="border:none;border-top:1px solid #E0D8CE;margin:32px 0;">
          <p style="color:#B87333;font-size:12px;margin:0;">Equipe Moova</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function diagnosticoReportEmail(params: {
  brokerName: string
  leadsContacted: number
  visitsScheduled: number
  estimatedCommission: number
  hotLeads: number
  dashboardUrl: string
}): { subject: string; html: string } {
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  return {
    subject: "Diagnóstico Nara 14 dias — seus resultados",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E0D8CE;overflow:hidden;">
        <tr><td style="background:#2D4A3E;padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#B87333;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Diagnóstico Nara · 14 dias</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:26px;font-weight:normal;">${params.brokerName}, aqui está o balanço</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" style="background:#F5F0E8;border-radius:8px;padding:20px;text-align:center;">
                <p style="margin:0;font-size:36px;font-weight:bold;color:#2D4A3E;">${params.leadsContacted}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#5A5A5A;">leads contatados</p>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#F5F0E8;border-radius:8px;padding:20px;text-align:center;">
                <p style="margin:0;font-size:36px;font-weight:bold;color:#B87333;">${params.visitsScheduled}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#5A5A5A;">visitas agendadas</p>
              </td>
            </tr>
            <tr><td colspan="3" style="padding:12px 0;"></td></tr>
            <tr>
              <td width="48%" style="background:#F5F0E8;border-radius:8px;padding:20px;text-align:center;">
                <p style="margin:0;font-size:36px;font-weight:bold;color:#2D4A3E;">${params.hotLeads}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#5A5A5A;">leads quentes</p>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#2D4A3E;border-radius:8px;padding:20px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:bold;color:#B87333;">${fmt(params.estimatedCommission)}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#E0D8CE;">comissão estimada</p>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr><td align="center">
              <a href="${params.dashboardUrl}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;">Ver relatório completo</a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #E0D8CE;margin:32px 0;">
          <p style="color:#B87333;font-size:12px;margin:0;">Equipe Moova</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function modoDesgradadoAlertEmail(params: {
  brokerName: string
  incidentAt: string
  affectedLeads: number
  dashboardUrl: string
}): { subject: string; html: string } {
  return {
    subject: "Alerta Moova — Nara operando em modo alternativo",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E0D8CE;overflow:hidden;">
        <tr><td style="background:#8B1A1A;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#FFD0D0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Alerta · Modo Alternativo</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:normal;">Nara está operando em modo reduzido</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#2D4A3E;font-size:15px;line-height:1.6;">${params.brokerName}, detectamos uma instabilidade nos serviços de IA às <strong>${params.incidentAt}</strong>.</p>
          <p style="color:#5A5A5A;font-size:15px;line-height:1.7;">Durante este período, a Nara enviou mensagens padrão para <strong>${params.affectedLeads} lead(s)</strong> informando que retornará em breve. As mensagens foram enfileiradas e serão reprocessadas automaticamente quando o serviço for restaurado.</p>
          <p style="color:#5A5A5A;font-size:14px;line-height:1.6;background:#FFF8F0;border-left:3px solid #B87333;padding:12px 16px;border-radius:0 8px 8px 0;">Nenhuma ação sua é necessária. Você será notificado quando tudo voltar ao normal.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr><td align="center">
              <a href="${params.dashboardUrl}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;">Acessar painel</a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #E0D8CE;margin:32px 0;">
          <p style="color:#B87333;font-size:12px;margin:0;">Equipe Moova</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function diagnosticoMarcoEmail(params: {
  brokerName: string
  dayNumber: 3 | 7 | 11 | 14
  messageContent: string
  leadsAttended: number
  visitsScheduled: number
  estimatedCommission: number
  dashboardUrl: string
}): { subject: string; html: string } {
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const actLabels: Record<number, string> = {
    3: "Ato I — A dúvida",
    7: "Ato II — A evidência",
    11: "Ato II — A evidência",
    14: "Ato III — A decisão",
  }
  return {
    subject: `Nara · Dia ${params.dayNumber} — ${actLabels[params.dayNumber]}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E0D8CE;overflow:hidden;">
        <tr><td style="background:#2D4A3E;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#B87333;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Diagnóstico Nara · Dia ${params.dayNumber}</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:normal;">${params.brokerName},</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#2D4A3E;font-size:16px;line-height:1.6;">${params.messageContent}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
              <td width="30%" style="background:#F5F0E8;border-radius:8px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:bold;color:#2D4A3E;">${params.leadsAttended}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#5A5A5A;">leads atendidos</p>
              </td>
              <td width="5%"></td>
              <td width="30%" style="background:#F5F0E8;border-radius:8px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:bold;color:#B87333;">${params.visitsScheduled}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#5A5A5A;">visitas agendadas</p>
              </td>
              <td width="5%"></td>
              <td width="30%" style="background:#2D4A3E;border-radius:8px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:20px;font-weight:bold;color:#B87333;">${fmt(params.estimatedCommission)}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#E0D8CE;">comissão estimada</p>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td align="center">
              <a href="${params.dashboardUrl}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;">Ver painel completo</a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #E0D8CE;margin:24px 0;">
          <p style="color:#B87333;font-size:12px;margin:0;">Nara · Moova</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function pactoMarcoEmail(params: {
  brokerName: string
  dayNumber: 30 | 45 | 75
  messageContent: string
  commissionAchieved: number
  meta: number
  goodFaithScore: number
  dashboardUrl: string
}): { subject: string; html: string } {
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const pct = Math.min(100, Math.round((params.commissionAchieved / params.meta) * 100))
  return {
    subject: `Pacto Moova 90 · Dia ${params.dayNumber} — atualização`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E0D8CE;overflow:hidden;">
        <tr><td style="background:#2D4A3E;padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#B87333;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Pacto Moova 90 · Dia ${params.dayNumber}</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:normal;">${params.brokerName},</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#2D4A3E;font-size:16px;line-height:1.6;">${params.messageContent}</p>
          <div style="background:#F5F0E8;border-radius:8px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:#5A5A5A;">Progresso para a meta de ${fmt(params.meta)}</p>
            <div style="background:#E0D8CE;border-radius:4px;height:8px;overflow:hidden;">
              <div style="background:#B87333;height:8px;width:${pct}%;border-radius:4px;"></div>
            </div>
            <p style="margin:8px 0 0;font-size:22px;font-weight:bold;color:#2D4A3E;">${fmt(params.commissionAchieved)} <span style="font-size:13px;color:#8A8A8A;font-weight:normal;">(${pct}%)</span></p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td align="center">
              <a href="${params.dashboardUrl}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;">Acompanhar no painel</a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #E0D8CE;margin:24px 0;">
          <p style="color:#B87333;font-size:12px;margin:0;">Nara · Moova</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function pactoVeredito90Email(params: {
  brokerName: string
  scenario: "A" | "B" | "C" | "D"
  refundAmount: number
  dashboardUrl: string
}): { subject: string; html: string } {
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const scenarioText: Record<string, { title: string; body: string; color: string }> = {
    A: {
      title: "Meta atingida — parabéns!",
      body: "Você chegou lá. A Nara trabalhou com você durante 90 dias e os resultados falam por si. Sem devolução, sem burocracia — você segue para o próximo ciclo com tudo que conquistou.",
      color: "#2D4A3E",
    },
    B: {
      title: "Boa-fé comprovada — devolução de 70%",
      body: `Você seguiu o processo com comprometimento, mas os resultados ficaram abaixo da meta. Reconhecemos isso. ${fmt(params.refundAmount)} serão devolvidos conforme o Pacto Moova 90.`,
      color: "#2D4A3E",
    },
    C: {
      title: "Engajamento parcial — devolução proporcional",
      body: `O engajamento com o processo foi parcial. De acordo com o Pacto Moova 90, ${fmt(params.refundAmount)} serão devolvidos, mais 1 mês adicional de acesso para você continuar.`,
      color: "#B87333",
    },
    D: {
      title: "Garantia anulada",
      body: "As condições do Pacto Moova 90 não foram cumpridas. A garantia foi anulada conforme os termos acordados.",
      color: "#8B1A1A",
    },
  }

  const s = scenarioText[params.scenario]

  return {
    subject: `Pacto Moova 90 — Cenário ${params.scenario}: ${s.title}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E0D8CE;overflow:hidden;">
        <tr><td style="background:${s.color};padding:32px 40px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Pacto Moova 90 · Cenário ${params.scenario}</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:26px;font-weight:normal;">${s.title}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#2D4A3E;font-size:16px;line-height:1.6;">${params.brokerName},</p>
          <p style="color:#5A5A5A;font-size:15px;line-height:1.7;">${s.body}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr><td align="center">
              <a href="${params.dashboardUrl}" style="display:inline-block;background:#2D4A3E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;">Ver meu veredito completo</a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #E0D8CE;margin:32px 0;">
          <p style="color:#B87333;font-size:12px;margin:0;">Equipe Moova</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
