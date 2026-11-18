-- Esquema do Recanto Camargo (sem dados)
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS `adm_administrador` (
  `Usu_Id` int NOT NULL,
  PRIMARY KEY (`Usu_Id`),
  KEY `fk_Adm_Administrador_Usu_Usuario1_idx` (`Usu_Id`),
  CONSTRAINT `fk_Adm_Administrador_Usu_Usuario1` FOREIGN KEY (`Usu_Id`) REFERENCES `usu_usuario` (`Usu_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `ava_avaliacao` (
  `Ava_Id` int NOT NULL AUTO_INCREMENT,
  `Imo_Id` int NOT NULL,
  `Res_Id` int NOT NULL,
  `Usu_Hos_Id` int NOT NULL,
  `Ava_Nota` decimal(3,1) NOT NULL,
  `Ava_Limpeza` decimal(2,1) DEFAULT '5.0',
  `Ava_Comunicacao` decimal(2,1) DEFAULT '5.0',
  `Ava_Localizacao` decimal(2,1) DEFAULT '5.0',
  `Ava_CustoBeneficio` decimal(2,1) DEFAULT '5.0',
  `Ava_Comentario` varchar(255) NOT NULL,
  `Ava_Data` datetime NOT NULL,
  `Ava_NotaPropietario` decimal(3,1) DEFAULT NULL,
  `Ava_ComentarioPropietario` varchar(255) DEFAULT NULL,
  `Ava_DataPropietario` datetime DEFAULT NULL,
  PRIMARY KEY (`Ava_Id`),
  UNIQUE KEY `Res_Reserva_Res_Id_UNIQUE` (`Res_Id`),
  KEY `fk_Ava_Avaliação_Hos_Hospede1_idx` (`Usu_Hos_Id`),
  KEY `fk_Ava_Avaliação_Res_Reserva1_idx` (`Res_Id`),
  KEY `fk_Ava_Avaliação_Imo_Imovel1_idx` (`Imo_Id`),
  KEY `idx_avaliacao_imovel_data` (`Imo_Id`,`Ava_Data` DESC),
  CONSTRAINT `fk_Ava_Avaliação_Hos_Hospede1` FOREIGN KEY (`Usu_Hos_Id`) REFERENCES `hos_hospede` (`Usu_Id`),
  CONSTRAINT `fk_Ava_Avaliação_Imo_Imovel1` FOREIGN KEY (`Imo_Id`) REFERENCES `imo_imovel` (`Imo_Id`),
  CONSTRAINT `fk_Ava_Avaliação_Res_Reserva1` FOREIGN KEY (`Res_Id`) REFERENCES `res_reserva` (`Res_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `bld_bloqueiodata` (
  `Bld_Id` int NOT NULL AUTO_INCREMENT,
  `Imo_Id` int NOT NULL,
  `Bld_Data` date NOT NULL,
  `Bld_Motivo` varchar(255) DEFAULT NULL,
  `Bld_Status` enum('ATIVO','CANCELADO') NOT NULL DEFAULT 'ATIVO',
  PRIMARY KEY (`Bld_Id`),
  UNIQUE KEY `unq_imo_data` (`Imo_Id`,`Bld_Data`),
  CONSTRAINT `fk_Bld_Imo` FOREIGN KEY (`Imo_Id`) REFERENCES `imo_imovel` (`Imo_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `blo_bloqueiohospede` (
  `Blo_Id` int NOT NULL AUTO_INCREMENT,
  `Imo_Id` int NOT NULL,
  `Usu_Id` int NOT NULL,
  `Blo_Data` date NOT NULL,
  `Blo_Motivo` varchar(145) NOT NULL,
  PRIMARY KEY (`Blo_Id`),
  KEY `fk_Blo_BloqueioHospede_Hos_Hospede1_idx` (`Usu_Id`),
  KEY `fk_Blo_BloqueioHospede_Imo_Imovel1_idx` (`Imo_Id`),
  CONSTRAINT `fk_Blo_BloqueioHospede_Hos_Hospede1` FOREIGN KEY (`Usu_Id`) REFERENCES `hos_hospede` (`Usu_Id`),
  CONSTRAINT `fk_Blo_BloqueioHospede_Imo_Imovel1` FOREIGN KEY (`Imo_Id`) REFERENCES `imo_imovel` (`Imo_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `cup_cupom` (
  `Cup_Id` int NOT NULL AUTO_INCREMENT,
  `Cup_Codigo` varchar(45) NOT NULL,
  `Cup_TipoDesconto` enum('PERCENTUAL','FIXO') NOT NULL,
  `Cup_ValorDoDesconto` decimal(10,2) NOT NULL,
  `Cup_DataValidade` date NOT NULL,
  `Cup_LimiteUso` int NOT NULL,
  `Cup_PublicoAlvo` enum('TODOS','PRIMEIRA_RESERVA','CLIENTE_ESPECIFICO','VIP','CLIENTE_RECORRENTE','CLIENTE_RETORNANTE') NOT NULL DEFAULT 'TODOS',
  `Cup_Cliente_Usu_Id` int DEFAULT NULL,
  `Cup_MinimoNoites` int NOT NULL DEFAULT '1',
  `Cup_ValorMinimo` decimal(10,2) NOT NULL DEFAULT '0.00',
  `Cup_Ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`Cup_Id`),
  KEY `fk_cup_cliente` (`Cup_Cliente_Usu_Id`),
  KEY `idx_cupom_codigo` (`Cup_Codigo`,`Cup_DataValidade`),
  CONSTRAINT `fk_cup_cliente` FOREIGN KEY (`Cup_Cliente_Usu_Id`) REFERENCES `usu_usuario` (`Usu_Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `dat_datadinamica` (
  `Dat_Id` int NOT NULL AUTO_INCREMENT,
  `Imo_Id` int NOT NULL,
  `Dat_Inicio` date NOT NULL,
  `Dat_Fim` date NOT NULL,
  `Dat_NomeEvento` varchar(100) NOT NULL,
  `Dat_PrecoDiaria` decimal(10,2) NOT NULL,
  PRIMARY KEY (`Dat_Id`),
  KEY `fk_Dat_DataDinamica_Imo_Imovel1_idx` (`Imo_Id`),
  CONSTRAINT `fk_Dat_DataDinamica_Imo_Imovel1` FOREIGN KEY (`Imo_Id`) REFERENCES `imo_imovel` (`Imo_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `fot_fotos` (
  `Fot_Id` int NOT NULL AUTO_INCREMENT,
  `Imo_Id` int NOT NULL,
  `Fot_Url` varchar(255) NOT NULL,
  `Fot_Legenda` varchar(100) NOT NULL,
  PRIMARY KEY (`Fot_Id`),
  KEY `fk_Fot_Fotos_Imo_Imovel1_idx` (`Imo_Id`),
  CONSTRAINT `fk_Fot_Fotos_Imo_Imovel1` FOREIGN KEY (`Imo_Id`) REFERENCES `imo_imovel` (`Imo_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `his_historicoreservastatus` (
  `His_id` int NOT NULL AUTO_INCREMENT,
  `Res_Id` int NOT NULL,
  `His_DataAlteracao` datetime NOT NULL,
  `His_StatusAnterior` varchar(45) NOT NULL,
  `His_StatusAtual` varchar(45) NOT NULL,
  `His_Motivo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`His_id`),
  KEY `fk_His_HistoricoReservaStatus_Res_Reserva1_idx` (`Res_Id`),
  CONSTRAINT `fk_His_HistoricoReservaStatus_Res_Reserva1` FOREIGN KEY (`Res_Id`) REFERENCES `res_reserva` (`Res_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hit_historicovalores` (
  `Hit_id` int NOT NULL AUTO_INCREMENT,
  `Imo_Id` int NOT NULL,
  `Dat_Id` int DEFAULT NULL,
  `Hit_Tipo` enum('SEMANA','FIM_SEMANA','DATA_ESPECIAL') NOT NULL DEFAULT 'SEMANA',
  `Hit_ValorAntigo` decimal(10,2) NOT NULL,
  `Hit_ValorNovo` decimal(10,2) NOT NULL,
  `Hit_DataAlteracao` datetime NOT NULL,
  PRIMARY KEY (`Hit_id`),
  KEY `fk_Hit_HistoricoValores_Imo_Imovel1_idx` (`Imo_Id`),
  KEY `fk_Hit_HistoricoValores_Dat_DataDinamica1_idx` (`Dat_Id`),
  CONSTRAINT `fk_Hit_HistoricoValores_Dat_DataDinamica1` FOREIGN KEY (`Dat_Id`) REFERENCES `dat_datadinamica` (`Dat_Id`),
  CONSTRAINT `fk_Hit_HistoricoValores_Imo_Imovel1` FOREIGN KEY (`Imo_Id`) REFERENCES `imo_imovel` (`Imo_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hos_hospede` (
  `Usu_Id` int NOT NULL,
  PRIMARY KEY (`Usu_Id`),
  KEY `fk_Hsp_Hospede_Usr_Usuario1_idx` (`Usu_Id`),
  CONSTRAINT `fk_Hsp_Hospede_Usr_Usuario1` FOREIGN KEY (`Usu_Id`) REFERENCES `usu_usuario` (`Usu_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `imo_imovel` (
  `Imo_Id` int NOT NULL AUTO_INCREMENT,
  `Pro_Proprietario_Usu_Id` int NOT NULL,
  `Imo_Nome` varchar(50) NOT NULL,
  `Imo_Endereco` varchar(145) NOT NULL,
  `Imo_Descricao` varchar(200) NOT NULL,
  `Imo_ValorFixo` decimal(10,2) NOT NULL,
  `Imo_ValorFimSemana` decimal(10,2) DEFAULT NULL,
  `Imo_Status` enum('ATIVO','INATIVO','MANUTENCAO') NOT NULL,
  `Imo_NotaMedial` decimal(3,1) NOT NULL,
  PRIMARY KEY (`Imo_Id`),
  KEY `fk_Imv_Imovel_Prp_Propietario1_idx` (`Pro_Proprietario_Usu_Id`),
  CONSTRAINT `fk_Imv_Imovel_Prp_Propietario1` FOREIGN KEY (`Pro_Proprietario_Usu_Id`) REFERENCES `pro_proprietario` (`Usu_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `not_notificacao` (
  `Not_Id` int NOT NULL AUTO_INCREMENT,
  `Usu_Id` int NOT NULL,
  `Not_Titulo` varchar(120) NOT NULL,
  `Not_Mensagem` varchar(500) NOT NULL,
  `Not_Tipo` enum('SUCESSO','ERRO','AVISO','INFO') NOT NULL DEFAULT 'INFO',
  `Not_Icone` varchar(50) DEFAULT NULL,
  `Not_Lida` tinyint(1) NOT NULL DEFAULT '0',
  `Not_CriadaEm` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Not_Id`),
  KEY `idx_not_usuario_lida` (`Usu_Id`,`Not_Lida`),
  CONSTRAINT `fk_Not_Notificacao_Usu_Usuario` FOREIGN KEY (`Usu_Id`) REFERENCES `usu_usuario` (`Usu_Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `pag_pagamento` (
  `Pag_Id` int NOT NULL AUTO_INCREMENT,
  `Res_Id` int NOT NULL,
  `Pag_Metodo` enum('PIX','CARTAO_CREDITO','BOLETO') NOT NULL,
  `Pag_Status` enum('PENDENTE','APROVADO','RECUSADO','REEMBOLSADO') NOT NULL,
  `Pag_Valor` decimal(10,2) NOT NULL,
  `Pag_DataHora` datetime NOT NULL,
  `Pag_PreferenciaId` varchar(100) DEFAULT NULL,
  `Pag_LinkPagamento` varchar(500) DEFAULT NULL,
  `Pag_TransacaoId` varchar(100) DEFAULT NULL,
  `Pag_ValorReembolsado` decimal(10,2) DEFAULT '0.00',
  `Pag_ReembolsoId` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`Pag_Id`),
  KEY `fk_Pag_Pagamento_Res_Reserva1_idx` (`Res_Id`),
  CONSTRAINT `fk_Pag_Pagamento_Res_Reserva1` FOREIGN KEY (`Res_Id`) REFERENCES `res_reserva` (`Res_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `pro_proprietario` (
  `Usu_Id` int NOT NULL,
  PRIMARY KEY (`Usu_Id`),
  KEY `fk_Prp_Propietario_Usr_Usuario_idx` (`Usu_Id`),
  CONSTRAINT `fk_Prp_Propietario_Usr_Usuario` FOREIGN KEY (`Usu_Id`) REFERENCES `usu_usuario` (`Usu_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `res_reserva` (
  `Res_Id` int NOT NULL AUTO_INCREMENT,
  `Cup_Id` int DEFAULT NULL,
  `Imo_Id` int NOT NULL,
  `Hos_Hospede_Usu_Id` int NOT NULL,
  `Res_DataCheckIn` datetime NOT NULL,
  `Res_DataCheckOut` datetime NOT NULL,
  `Res_QuantidadeDeHospedes` int NOT NULL,
  `Res_ValorTotal` decimal(10,2) NOT NULL,
  `Res_Status` enum('PENDENTE','PAGAMENTO_PENDENTE','CONFIRMADA','CANCELADA','CONCLUIDA','RECUSADA') NOT NULL DEFAULT 'PENDENTE',
  `Res_DataReserva` datetime NOT NULL,
  `Res_ObsHospede` varchar(255) DEFAULT NULL,
  `Res_ObsPropietario` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Res_Id`),
  KEY `fk_Res_Reserva_Hos_Hospede1_idx` (`Hos_Hospede_Usu_Id`),
  KEY `fk_Res_Reserva_Imo_Imovel1_idx` (`Imo_Id`),
  KEY `fk_Res_Reserva_Cup_Cupom1_idx` (`Cup_Id`),
  CONSTRAINT `fk_Res_Reserva_Cup_Cupom1` FOREIGN KEY (`Cup_Id`) REFERENCES `cup_cupom` (`Cup_Id`),
  CONSTRAINT `fk_Res_Reserva_Hos_Hospede1` FOREIGN KEY (`Hos_Hospede_Usu_Id`) REFERENCES `hos_hospede` (`Usu_Id`),
  CONSTRAINT `fk_Res_Reserva_Imo_Imovel1` FOREIGN KEY (`Imo_Id`) REFERENCES `imo_imovel` (`Imo_Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `usu_usuario` (
  `Usu_Id` int NOT NULL AUTO_INCREMENT,
  `Usu_Nome` varchar(100) NOT NULL,
  `Usu_CPF` varchar(255) NOT NULL,
  `Usu_CPF_Hash` varchar(255) NOT NULL,
  `Usu_Email` varchar(255) NOT NULL,
  `Usu_Telefone` varchar(255) NOT NULL,
  `Usu_SenhaHash` varchar(255) NOT NULL,
  `Usu_Status` enum('ATIVO','INATIVO','BLOQUEADO') NOT NULL,
  `Usu_DataAceiteTermos` datetime DEFAULT NULL,
  `Usu_IpAceite` varchar(45) DEFAULT NULL,
  `Usu_VersaoTermosAceitos` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`Usu_Id`),
  UNIQUE KEY `Usu_CPF_Hash_UNIQUE` (`Usu_CPF_Hash`),
  UNIQUE KEY `Usu_Email_UNIQUE` (`Usu_Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;
