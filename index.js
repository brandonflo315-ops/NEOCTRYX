require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  EmbedBuilder,
  PermissionFlagsBits,
  AuditLogEvent
} = require('discord.js');

const { commands } = require('./commands');
const SECURITY_FILE = path.join(__dirname, 'security.json');

function loadSecurity() {
  try {
    const data = JSON.parse(fs.readFileSync(SECURITY_FILE, 'utf8'));
    if (!data.guilds || typeof data.guilds !== 'object') {
      data.guilds = {};
    }
    return data;
  } catch {
    return { guilds: {} };
  }
}

const securityData = loadSecurity();

function saveSecurity() {
  fs.writeFileSync(
    SECURITY_FILE,
    JSON.stringify(securityData, null, 2),
    'utf8'
  );
}

function config(guildId) {
  if (!securityData.guilds[guildId]) {
    securityData.guilds[guildId] = {};
  }

  const s = securityData.guilds[guildId];

  if (!Array.isArray(s.allowedBots)) s.allowedBots = [];
  if (!Array.isArray(s.trustedUsers)) s.trustedUsers = [];
  if (s.antispam === undefined) s.antispam = s.antiSpam ?? true;
  if (s.antilinks === undefined) s.antilinks = s.antiLinks ?? false;
  if (s.antinuke === undefined) s.antinuke = s.antiNuke ?? false;
  if (s.logs === undefined) s.logs = s.logsChannelId ?? null;
  if (s.autorole === undefined) s.autorole = null;
  if (s.antiraid === undefined) s.antiraid = false;

  return s;
}


 const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

const warnings = new Map();
const spamCache = new Map();

function embed(title, description, color = 0xE60026) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'Dev : @Muertoffx' })
    .setTimestamp();
}

// REGISTROS AUTOMÁTICOS EN EL CANAL CONFIGURADO O EN #logs
async function log(guild, description) {
  const s = config(guild.id);

  let channel = s.logs
    ? guild.channels.cache.get(s.logs)
    : null;

  if (!channel?.isTextBased() || typeof channel.send !== 'function') {
    channel = guild.channels.cache.find(
      c => c.name === 'logs' &&
        c.isTextBased() &&
        typeof c.send === 'function'
    );
  }

  if (!channel) {
    console.warn(`[NOCTRYX] No encontré #logs en ${guild.name}`);
    return;
  }

  try {
    await channel.send({
      embeds: [embed('📋 Registro NOCTRYX', description)]
    });
  } catch (error) {
    console.error('[NOCTRYX] Error enviando registro:', error.message);
  }
}

// INICIO Y REGISTRO DE COMANDOS
client.once(Events.ClientReady, async ready => {
  console.log(`🛡️ NOCTRYX conectado como ${ready.user.tag}`);

  if (!process.env.CLIENT_ID || !process.env.DISCORD_TOKEN) {
    console.error('Faltan CLIENT_ID o DISCORD_TOKEN en las variables de entorno.');
    return;
  }

  const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_TOKEN);

  for (const guild of ready.guilds.cache.values()) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
        { body: commands }
      );
      console.log(`Comandos registrados en: ${guild.name}`);
    } catch (error) {
      console.error(`Error registrando comandos en ${guild.name}:`, error.message);
    }
  }
});// COMANDOS SLASH
client.on(Events.InteractionCreate, async i => {
  if (!i.isChatInputCommand() || !i.guild) return;

  const name = i.commandName;
  const s = config(i.guild.id);

  try {
    // CONTROL DE BOTS AUTORIZADOS
    if (['botallow', 'botdeny', 'botlist'].includes(name)) {
      if (!i.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return i.reply({
          content: '⛔ Solo administradores pueden gestionar bots autorizados.',
          ephemeral: true
        });
      }

      if (name === 'botlist') {
        return i.reply({
          content: s.allowedBots.length
            ? `🤖 **Bots autorizados:**\n${s.allowedBots.map(id => `• <@${id}> — \`${id}\``).join('\n')}`
            : '📭 No hay bots autorizados todavía.',
          ephemeral: true
        });
      }

      const id = i.options.getString('id')?.trim();

      if (!id || !/^\d{17,20}$/.test(id)) {
        return i.reply({
          content: '❌ ID de Discord no válida.',
          ephemeral: true
        });
      }

      if (name === 'botallow') {
        if (s.allowedBots.includes(id)) {
          return i.reply({
            content: 'ℹ️ Ese bot ya está autorizado.',
            ephemeral: true
          });
        }
        s.allowedBots.push(id);
      } else {
        s.allowedBots = s.allowedBots.filter(botId => botId !== id);
      }

      saveSecurity();

      return i.reply({
        content: name === 'botallow'
          ? `✅ Bot \`${id}\` autorizado.`
          : `🗑️ Autorización retirada para \`${id}\`.`,
        ephemeral: true
      });
    }

    const isAdmin = i.memberPermissions?.has(
      PermissionFlagsBits.Administrator
    );

    const needsAdmin = [
      'antiraid', 'antinuke', 'antispam', 'antilinks',
      'logs', 'whitelist', 'backup', 'config', 'autorole',
      'lock', 'unlock'
    ];

    if (needsAdmin.includes(name) && !isAdmin) {
      return i.reply({
        content: '⛔ Necesitas permiso de Administrador.',
        ephemeral: true
      });
    }

    if (name === 'ping') {
      return i.reply({
        embeds: [embed('🏓 Pong', `Latencia: ${client.ws.ping} ms`)]
      });
    }

    if (name === 'status') {
      return i.reply({
        embeds: [
          embed(
            '🛡️ NOCTRYX',
            '🟢 Bot conectado\n⚙️ Comandos registrados\n' +
            '🤖 Control de bots no autorizados\n' +
            '📋 Registros en el canal configurado o en #logs.'
          )
        ]
      });
    }

    if (name === 'security') {
      return i.reply({
        embeds: [
          embed(
            '🛡️ Seguridad del servidor',
            `Anti-spam: ${s.antispam ? 'Activado' : 'Desactivado'}\n` +
            `Anti-enlaces: ${s.antilinks ? 'Activado' : 'Desactivado'}\n` +
            `Alertas anti-nuke: ${s.antinuke ? 'Activadas' : 'Desactivadas'}\n` +
            `Anti-raid: configuración ${s.antiraid ? 'activada' : 'desactivada'}\n` +
            `Bots autorizados: ${s.allowedBots.length}\n` +
            `Canal de logs: ${s.logs ? `<#${s.logs}>` : '#logs automático si existe'}`
          )
        ]
      });
    }

    if (['antiraid', 'antinuke', 'antispam', 'antilinks'].includes(name)) {
      const active = i.options.getBoolean('activo');

      if (active === null) {
        return i.reply({
          content: 'Debes elegir activar o desactivar el módulo.',
          ephemeral: true
        });
      }

      s[name] = active;
      saveSecurity();

      let note = '';

      if (name === 'antinuke' && active) {
        note = '\n⚠️ Genera alertas, pero no revierte automáticamente los daños.';
      }

      if (name === 'antiraid') {
        note = '\nℹ️ La detección automática de entradas masivas aún no está implementada.';
      }

      return i.reply({
        embeds: [
          embed(
            '⚙️ Configuración actualizada',
            `${name}: ${active ? 'Activado' : 'Desactivado'}${note}`
          )
        ]
      });
    }

  
if (name === 'logs') {
  const channel = i.options.getChannel('canal');

  if (
    !channel ||
    !channel.isTextBased() ||
    typeof channel.send !== 'function'
  ) {
    return i.reply({
      content: '❌ Elige un canal de texto válido.',
      ephemeral: true
    });
  }

  try {
    await channel.send({
      embeds: [
        embed(
          '✅ NOCTRYX — Prueba de registros',
          '¡El canal de logs funciona correctamente!'
        )
      ]
    });

    s.logs = channel.id;
    saveSecurity();

    return i.reply({
      content: `✅ Canal configurado y prueba enviada a ${channel}.`,
      ephemeral: true
    });
  } catch (error) {
    console.error('[NOCTRYX] Error probando logs:', error);

    return i.reply({
      content: '❌ No pude enviar mensajes a ese canal. Revisa mis permisos.',
      ephemeral: true
    });
  }
}


    if (name === 'whitelist') {
      const user = i.options.getUser('usuario');
      const action = i.options.getSubcommand();

      if (action === 'agregar') {
        if (!s.trustedUsers.includes(user.id)) {
          s.trustedUsers.push(user.id);
        }
      } else {
        s.trustedUsers = s.trustedUsers.filter(id => id !== user.id);
      }

      saveSecurity();

      return i.reply({
        content: `✅ Lista de confianza actualizada para ${user.tag}.`,
        ephemeral: true
      });
    }

    if (name === 'backup') {
      const channels = i.guild.channels.cache.map(
        c => `${c.type}: ${c.name}`
      );

      return i.reply({
        embeds: [
          embed(
            '📦 Respaldo informativo',
            `Canales encontrados: ${channels.length}\n` +
            `${channels.slice(0, 40).join('\n')}\n\n` +
            '⚠️ No crea una copia restaurable de roles, permisos o mensajes.'
          )
        ]
      });
    }

    if (name === 'config') {
      return i.reply({
        embeds: [
          embed(
            '⚙️ Configuración',
            `Servidor: ${i.guild.name}\n` +
            `Canal de logs: ${s.logs ? `<#${s.logs}>` : '#logs automático si existe'}\n` +
            `Auto-rol: ${s.autorole ? `<@&${s.autorole}>` : 'No configurado'}`
          )
        ]
      });
    }

    if (name === 'autorole') {
      const role = i.options.getRole('rol');

      if (!role) {
        return i.reply({
          content: 'No encontré el rol elegido.',
          ephemeral: true
        });
      }

      s.autorole = role.id;
      saveSecurity();

      return i.reply({
        content: '✅ Auto-rol guardado. Necesito Gestionar roles y estar por encima del rol elegido.',
        ephemeral: true
      });
    }

    if (['ban', 'kick', 'timeout'].includes(name)) {
      const target = i.options.getUser('usuario');
      const reason = i.options.getString('motivo') || 'Sin motivo indicado';

      if (target.id === i.user.id) {
        return i.reply({
          content: 'No puedes aplicar esta acción sobre ti mismo.',
          ephemeral: true
        });
      }

      const targetMember = await i.guild.members.fetch(target.id).catch(() => null);

      if (!targetMember) {
        return i.reply({
          content: 'No encontré a ese miembro en el servidor.',
          ephemeral: true
        });
      }

      if (name === 'ban') {
        if (!i.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
          return i.reply({
            content: 'Te falta el permiso Banear miembros.',
            ephemeral: true
          });
        }

        await targetMember.ban({
          reason: `${reason} | Moderador: ${i.user.tag}`
        });
      } else if (name === 'kick') {
        if (!i.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
          return i.reply({
            content: 'Te falta el permiso Expulsar miembros.',
            ephemeral: true
          });
        }

        await targetMember.kick(`${reason} | Moderador: ${i.user.tag}`);
      } else {
        if (!i.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
          return i.reply({
            content: 'Te falta el permiso Moderar miembros.',
            ephemeral: true
          });
        }

        const minutes = i.options.getInteger('minutos');
        await targetMember.timeout(minutes * 60 * 1000, reason);
      }

      await log(
        i.guild,
        `🛡️ Acción: **${name}**\n` +
        `Usuario: ${target.tag} (\`${target.id}\`)\n` +
        `Motivo: ${reason}\nModerador: ${i.user.tag}`
      );

      return i.reply({
        content: `✅ Acción **${name}** aplicada a ${target.tag}.`
      });
    }

    if (name === 'warn') {
      const user = i.options.getUser('usuario');
      const reason = i.options.getString('motivo') || 'Sin motivo';
      const key = `${i.guild.id}:${user.id}`;

      warnings.set(key, (warnings.get(key) || 0) + 1);

      await log(
        i.guild,
        `⚠️ Advertencia a ${user.tag} (\`${user.id}\`)\n` +
        `Motivo: ${reason}\nModerador: ${i.user.tag}`
      );

      return i.reply({
        content: `⚠️ Advertencia registrada para ${user.tag}. Total en esta sesión: ${warnings.get(key)}.`
      });
    }

    if (name === 'clear') {
      if (!i.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
        return i.reply({
          content: 'Te falta Gestionar mensajes.',
          ephemeral: true
        });
      }

      if (!i.channel?.isTextBased() || !i.channel.messages) {
        return i.reply({
          content: 'Este canal no admite mensajes.',
          ephemeral: true
        });
      }

      const amount = i.options.getInteger('cantidad');
      const deleted = await i.channel.bulkDelete(amount, true);

      await log(
        i.guild,
        `🧹 Limpieza de mensajes\nCanal: ${i.channel}\n` +
        `Mensajes eliminados: ${deleted.size}\nModerador: ${i.user.tag}`
      );

      return i.reply({
        content: `🧹 Eliminé ${deleted.size} mensajes recientes.`,
        ephemeral: true
      });
    }

    if (name === 'lock' || name === 'unlock') {
      if (!i.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return i.reply({
          content: 'Te falta Gestionar canales.',
          ephemeral: true
        });
      }

      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, {
        SendMessages: name === 'unlock' ? null : false
      });

      await log(
        i.guild,
        `${name === 'lock' ? '🔒 Canal bloqueado' : '🔓 Canal desbloqueado'}\n` +
        `Canal: ${i.channel}\nModerador: ${i.user.tag}`
      );

      return i.reply({
        content: name === 'lock' ? '🔒 Canal bloqueado.' : '🔓 Canal desbloqueado.'
      });
    }

    if (name === 'help') {
      return i.reply({
        embeds: [
          embed(
            '📚 NOCTRYX — Comandos',
            '`/ping` `/status` `/security` `/help` `/botinfo`\n' +
            '`/botallow` `/botdeny` `/botlist`\n' +
            '`/antiraid` `/antinuke` `/antispam` `/antilinks`\n' +
            '`/logs` `/whitelist` `/backup` `/config` `/autorole`\n' +
            '`/ban` `/kick` `/timeout` `/warn` `/clear` `/lock` `/unlock`'
          )
        ]
      });
    }

    if (name === 'botinfo') {
      return i.reply({
        embeds: [
          embed('💠 NOCTRYX', 'Bot de seguridad modular para Discord.\nDev : @Muertoffx')
        ]
      });
    }
  } catch (error) {
    console.error(`Error en /${name}:`, error);

    const response = {
      content: `❌ No pude completar /${name}. Revisa permisos y jerarquía de roles.`,
      ephemeral: true
    };

    if (i.replied || i.deferred) {
      return i.followUp(response).catch(() => {});
    }

    return i.reply(response).catch(() => {});
  }
});// MENSAJES: ANTI-ENLACES Y ANTI-SPAM

 // MENSAJES: ANTI-ENLACES Y ANTI-SPAM
client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot || !message.member) return;

  const s = config(message.guild.id);

  const isModerator = message.member.permissions.has(
    PermissionFlagsBits.ManageMessages
  );

  if (isModerator) return;

  // ANTI-LINKS
  if (
    s.antilinks &&
    /(https?:\/\/|discord\.gg\/|discord\.com\/invite\/)/i.test(message.content)
  ) {
    try {
      await message.delete();

      await log(
        message.guild,
        `🔗 Enlace eliminado\n` +
        `Usuario: ${message.author.tag}\n` +
        `Canal: #${message.channel.name}`
      );
    } catch (error) {
      console.error('[ANTI-LINKS] Error:', error.message);
    }
  }

  // ANTI-SPAM
  if (s.antispam) {
    const now = Date.now();
    const key = `${message.guild.id}:${message.author.id}`;

    const recent = (spamCache.get(key) || []).filter(
      time => now - time < 7000
    );

    recent.push(now);
    spamCache.set(key, recent);

    if (recent.length >= 5) {
      spamCache.delete(key);

      try {
        await message.delete().catch(() => {});

        await message.member.timeout(
          60 * 1000,
          'NOCTRYX: spam detectado'
        );

        await message.channel.send(
          `🚨 ${message.author}, detecté spam. Timeout de 1 minuto.\nDev : @Muertoffx`
        );

        await log(
          message.guild,
          `🚨 Anti-spam activado\n` +
          `Usuario: ${message.author.tag}\n` +
          `Acción: timeout de 1 minuto`
        );
      } catch (error) {
        console.error('[ANTI-SPAM] Error:', error.message);
      }
    }
  }
});

// REGISTRO DE MENSAJES ELIMINADOS
client.on(Events.MessageDelete, async (message) => {
  if (!message.guild) return;

  const autor = message.author
    ? `${message.author.tag} (${message.author.id})`
    : 'Autor desconocido';

  const contenido = message.content?.trim()
    ? message.content.slice(0, 1000)
    : '[Contenido no disponible en caché]';

  await log(
    message.guild,
    `🗑️ **Mensaje eliminado**\n` +
    `**Autor:** ${autor}\n` +
    `**Canal:** <#${message.channelId}>\n` +
    `**Contenido:** ${contenido}`
  );
});

// NUEVOS MIEMBROS Y CONTROL DE BOTS
client.on(Events.GuildMemberAdd, async member => {
  const s = config(member.guild.id);

  if (member.user.bot) {
    if (member.id === client.user?.id) return;

    if (s.allowedBots.includes(member.id)) {
      await log(
        member.guild,
        `🤖 Bot autorizado ingresó: ${member.user.tag} (\`${member.id}\`)`
      );
      return;
    }

    try {
      const me = member.guild.members.me;

      if (!me?.permissions.has(PermissionFlagsBits.KickMembers)) {
        await log(
          member.guild,
          `⚠️ No pude expulsar al bot ${member.user.tag}: falta permiso para expulsar miembros.`
        );
        return;
      }

      await member.kick('NOCTRYX: bot no autorizado');

      await log(
        member.guild,
        `🛑 Bot no autorizado expulsado: ${member.user.tag} (\`${member.id}\`)`
      );
    } catch (error) {
      console.error(
        `[NOCTRYX] No pude expulsar a ${member.user.tag}:`,
        error.message
      );

      await log(
        member.guild,
        `⚠️ No pude expulsar al bot ${member.user.tag}. Comprueba permisos y jerarquía de roles.`
      );
    }

    return;
  }

  if (s.autorole) {
    const role = member.guild.roles.cache.get(s.autorole);

    if (role) {
      await member.roles.add(role).catch(error => {
        console.error('Error auto-rol:', error.message);
      });
    }
  }

  await log(
    member.guild,
    `👋 Nuevo miembro\nUsuario: ${member.user.tag}\nID: \`${member.id}\``
  );
});

// MIEMBROS QUE SALEN DEL SERVIDOR
client.on(Events.GuildMemberRemove, async member => {
  await log(
    member.guild,
    `🚪 Miembro salió del servidor\nUsuario: ${member.user.tag}\nID: \`${member.id}\``
  );
});

// ALERTAS ANTI-NUKE
client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
  const s = config(guild.id);
  if (!s.antinuke) return;

  const dangerousActions = [
    AuditLogEvent.ChannelDelete,
    AuditLogEvent.RoleDelete,
    AuditLogEvent.MemberBanAdd,
    AuditLogEvent.WebhookCreate
  ];

  if (!dangerousActions.includes(entry.action)) return;

  await log(
    guild,
    `🚨 **Alerta anti-nuke**\n` +
    `Acción detectada: ${String(entry.action)}\n` +
    `Ejecutor: ${entry.executorId ? `<@${entry.executorId}>` : 'Desconocido'}\n` +
    `Objetivo: ${entry.targetId || 'No disponible'}\n` +
    '⚠️ Esta alerta no revierte la acción automáticamente.'
  );
});

// INICIAR NOCTRYX
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ Falta DISCORD_TOKEN en las variables de entorno.');
} else {
  client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Error al iniciar NOCTRYX:', error.message);
  });
}