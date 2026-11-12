package com.balance.app.debt;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
@Configuration
@EnableScheduling
@ConditionalOnProperty(name="balance.debts.scheduler-enabled",havingValue="true",matchIfMissing=true)
public class DebtAutomationScheduler {
 private final DebtAutomationService service;
 public DebtAutomationScheduler(DebtAutomationService service){this.service=service;}
 @Scheduled(initialDelayString="${balance.debts.initial-delay-ms:10000}",fixedDelayString="${balance.debts.poll-ms:60000}")
 public void tick(){for(var id:service.due())for(int i=0;i<24;i++)try{if(!service.runDue(id))break;}catch(Exception e){LoggerFactory.getLogger(getClass()).warn("Debt automatic payment failed for {}",id);try{service.failure(id,"Автооплата не выполнена. Проверьте счёт и историю долга.");}catch(Exception ignored){}break;}}
}
