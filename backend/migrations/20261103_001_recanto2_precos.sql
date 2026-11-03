-- =============================================================================
-- Migração 2026-11-03: Recanto Camargo 2 + preço de fim de semana + datas especiais
-- Rodar UMA vez no banco (Workbench: abrir o arquivo e executar com o raio).
-- =============================================================================

-- 1) Preço de fim de semana por imóvel (noites de sexta e sábado).
--    Imo_ValorFixo continua sendo o preço dos dias de semana.
ALTER TABLE `imo_imovel`
  ADD COLUMN `Imo_ValorFimSemana` DECIMAL(10,2) NULL AFTER `Imo_ValorFixo`;

-- 2) Histórico de preços passa a dizer qual preço mudou.
ALTER TABLE `hit_historicovalores`
  ADD COLUMN `Hit_Tipo` ENUM('SEMANA','FIM_SEMANA','DATA_ESPECIAL') NOT NULL DEFAULT 'SEMANA' AFTER `Dat_Id`;

-- 3) Recanto Camargo 1: nome, capacidade correta (10) e preços atuais.
UPDATE `imo_imovel`
SET `Imo_Nome` = 'Recanto Camargo 1',
    `Imo_Endereco` = 'Rua José Ourives, 76 - Ponte Alta, Aparecida/SP',
    `Imo_Descricao` = 'Casa completa a 5 min a pé da Basílica: 2 quartos, sala com sofás-cama, cozinha equipada, área gourmet com churrasqueira e garagem. Até 10 hóspedes.',
    `Imo_ValorFixo` = 350.00,
    `Imo_ValorFimSemana` = 450.00
WHERE `Imo_Id` = 1;

-- 4) Recanto Camargo 2 (mesmo proprietário do imóvel 1).
INSERT INTO `imo_imovel`
  (`Imo_Id`, `Pro_Proprietario_Usu_Id`, `Imo_Nome`, `Imo_Endereco`, `Imo_Descricao`, `Imo_ValorFixo`, `Imo_ValorFimSemana`, `Imo_Status`, `Imo_NotaMedial`)
SELECT 2, `Pro_Proprietario_Usu_Id`, 'Recanto Camargo 2',
       'Américo Ferreira Iria, 240 - Ponte Alta, Aparecida/SP',
       'Casa completa na Ponte Alta, perto da Basílica: 2 quartos com ventilador de teto, sala, cozinha equipada e área gourmet com churrasqueira no terraço. Até 10 hóspedes.',
       350.00, 450.00, 'ATIVO', 5.0
FROM `imo_imovel` WHERE `Imo_Id` = 1
  AND NOT EXISTS (SELECT 1 FROM `imo_imovel` WHERE `Imo_Id` = 2);

-- Conferência
SELECT Imo_Id, Imo_Nome, Imo_ValorFixo, Imo_ValorFimSemana, Imo_Status FROM `imo_imovel`;
