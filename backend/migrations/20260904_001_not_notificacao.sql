-- Executar manualmente no banco selecionado, após aprovação.
CREATE TABLE IF NOT EXISTS `not_notificacao` (
  `Not_Id` INT NOT NULL AUTO_INCREMENT,
  `Usu_Id` INT NOT NULL,
  `Not_Titulo` VARCHAR(120) NOT NULL,
  `Not_Mensagem` VARCHAR(500) NOT NULL,
  `Not_Tipo` ENUM('SUCESSO','ERRO','AVISO','INFO') NOT NULL DEFAULT 'INFO',
  `Not_Icone` VARCHAR(50) NULL,
  `Not_Lida` TINYINT(1) NOT NULL DEFAULT 0,
  `Not_CriadaEm` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Not_Id`),
  INDEX `idx_not_usuario_lida` (`Usu_Id` ASC, `Not_Lida` ASC),
  CONSTRAINT `fk_Not_Notificacao_Usu_Usuario`
    FOREIGN KEY (`Usu_Id`)
    REFERENCES `usu_usuario` (`Usu_Id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
