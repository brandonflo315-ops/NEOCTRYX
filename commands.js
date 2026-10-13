
const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Comprueba la latencia'),
  new SlashCommandBuilder().setName('status').setDescription('Estado de NOCTRYX'),
  new SlashCommandBuilder().setName('security').setDescription('Estado de seguridad'),
  new SlashCommandBuilder().setName('antiraid').setDescription('Configura anti-raid')
    .addBooleanOption(o => o.setName('activo').setDescription('Activar o desactivar').setRequired(true)),
  new SlashCommandBuilder().setName('antinuke').setDescription('Configura anti-nuke')
    .addBooleanOption(o => o.setName('activo').setDescription('Activar o desactivar').setRequired(true)),
  new SlashCommandBuilder().setName('antispam').setDescription('Configura anti-spam')
    .addBooleanOption(o => o.setName('activo').setDescription('Activar o desactivar').setRequired(true)),
  new SlashCommandBuilder().setName('antilinks').setDescription('Configura anti-enlaces')
    .addBooleanOption(o => o.setName('activo').setDescription('Activar o desactivar').setRequired(true)),
  new SlashCommandBuilder().setName('logs').setDescription('Configura el canal de registros')
    .addChannelOption(o => o.setName('canal').setDescription('Canal de registros').setRequired(true)),
  new SlashCommandBuilder().setName('whitelist').setDescription('Gestiona usuarios de confianza')
    .addSubcommand(s => s.setName('agregar').setDescription('Añade confianza')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand(s => s.setName('quitar').setDescription('Quita confianza')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))),
  new SlashCommandBuilder().setName('backup').setDescription('Crea un respaldo básico de canales'),
  new SlashCommandBuilder().setName('config').setDescription('Muestra la configuración del servidor'),
  new SlashCommandBuilder().setName('ban').setDescription('Expulsa permanentemente a un usuario')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo')),
  new SlashCommandBuilder().setName('kick').setDescription('Expulsa a un usuario')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo')),
  new SlashCommandBuilder().setName('timeout').setDescription('Aplica tiempo fuera')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption(o => o.setName('minutos').setDescription('Duración en minutos').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo')),
  new SlashCommandBuilder().setName('warn').setDescription('Advierte a un usuario')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true)),
  new SlashCommandBuilder().setName('clear').setDescription('Elimina mensajes recientes')
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad: 1 a 100').setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName('lock').setDescription('Bloquea el canal actual'),
  new SlashCommandBuilder().setName('unlock').setDescription('Desbloquea el canal actual'),
  new SlashCommandBuilder().setName('autorole').setDescription('Configura el rol automático')
    .addRoleOption(o => o.setName('rol').setDescription('Rol para nuevos miembros').setRequired(true)),
  new SlashCommandBuilder().setName('help').setDescription('Lista de comandos'),
  new SlashCommandBuilder().setName('botinfo').setDescription('Información del bot'),
  
  new SlashCommandBuilder().setName('verify').setDescription('Información del proceso de verificación'),


new SlashCommandBuilder()
  .setName('botallow')
  .setDescription('Autoriza un bot en este servidor')
  .addStringOption(o =>
    o.setName('id')
      .setDescription('ID del bot autorizado')
      .setRequired(true)
  ),

new SlashCommandBuilder()
  .setName('botdeny')
  .setDescription('Retira la autorización de un bot')
  .addStringOption(o =>
    o.setName('id')
      .setDescription('ID del bot')
      .setRequired(true)
  ),

new SlashCommandBuilder()
  .setName('botlist')
  .setDescription('Muestra los bots autorizados'),



].map(c => c.toJSON());

module.exports = { commands };
