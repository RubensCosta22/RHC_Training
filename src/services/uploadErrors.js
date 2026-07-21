const ERROR_MESSAGES = {
  'access denied': 'Você não tem permissão para alterar este perfil.',
  'rate limit exceeded': 'Muitas tentativas de envio. Aguarde um pouco e tente novamente.',
  'image size exceeds safe limit': 'A imagem excede o limite de tamanho permitido.',
  'unsupported or invalid image': 'O arquivo não é uma imagem válida ou suportada.',
  'image dimensions exceed safe limit': 'As dimensões da imagem excedem o limite permitido.',
  'profile not found': 'Perfil não encontrado ou indisponível para esta conta.'
}

export function friendlyUploadError(message) {
  return ERROR_MESSAGES[message] || 'Falha no envio seguro da imagem.'
}
