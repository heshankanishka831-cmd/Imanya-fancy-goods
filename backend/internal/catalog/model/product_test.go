package model

import (
	"testing"
	"time"
)

func TestProduct_EffectivePrice_NoDiscount(t *testing.T) {
	p := Product{
		SellingPrice:      10000,
		IsDiscountEnabled: false,
		DiscountPercent:   0,
	}

	effPrice, discAmt, discPct, isActive := p.EffectivePrice(time.Now())
	if isActive {
		t.Fatalf("expected discount to be inactive, got active")
	}
	if effPrice != 10000 {
		t.Fatalf("expected effective price 10000, got %f", effPrice)
	}
	if discAmt != 0 {
		t.Fatalf("expected discount amount 0, got %f", discAmt)
	}
	if discPct != 0 {
		t.Fatalf("expected discount percent 0, got %f", discPct)
	}
}

func TestProduct_EffectivePrice_ActiveDiscount(t *testing.T) {
	p := Product{
		SellingPrice:      10000,
		IsDiscountEnabled: true,
		DiscountPercent:   20,
	}

	now := time.Now()
	effPrice, discAmt, discPct, isActive := p.EffectivePrice(now)
	if !isActive {
		t.Fatalf("expected discount to be active")
	}
	if effPrice != 8000 {
		t.Fatalf("expected effective price 8000, got %f", effPrice)
	}
	if discAmt != 2000 {
		t.Fatalf("expected discount amount 2000, got %f", discAmt)
	}
	if discPct != 20 {
		t.Fatalf("expected discount percent 20, got %f", discPct)
	}
	if status := p.DiscountStatus(now); status != "ACTIVE" {
		t.Fatalf("expected status ACTIVE, got %s", status)
	}
}

func TestProduct_EffectivePrice_ScheduledDiscount(t *testing.T) {
	futureStart := time.Now().Add(24 * time.Hour)
	futureEnd := time.Now().Add(48 * time.Hour)

	p := Product{
		SellingPrice:      5000,
		IsDiscountEnabled: true,
		DiscountPercent:   15,
		DiscountStartDate: &futureStart,
		DiscountEndDate:   &futureEnd,
	}

	now := time.Now()
	effPrice, discAmt, _, isActive := p.EffectivePrice(now)
	if isActive {
		t.Fatalf("expected discount to be inactive before start date")
	}
	if effPrice != 5000 {
		t.Fatalf("expected original price 5000, got %f", effPrice)
	}
	if discAmt != 0 {
		t.Fatalf("expected discount amount 0, got %f", discAmt)
	}
	if status := p.DiscountStatus(now); status != "SCHEDULED" {
		t.Fatalf("expected status SCHEDULED, got %s", status)
	}
}

func TestProduct_EffectivePrice_ExpiredDiscount(t *testing.T) {
	pastStart := time.Now().Add(-48 * time.Hour)
	pastEnd := time.Now().Add(-24 * time.Hour)

	p := Product{
		SellingPrice:      5000,
		IsDiscountEnabled: true,
		DiscountPercent:   15,
		DiscountStartDate: &pastStart,
		DiscountEndDate:   &pastEnd,
	}

	now := time.Now()
	effPrice, discAmt, _, isActive := p.EffectivePrice(now)
	if isActive {
		t.Fatalf("expected discount to be inactive after end date")
	}
	if effPrice != 5000 {
		t.Fatalf("expected original price 5000, got %f", effPrice)
	}
	if discAmt != 0 {
		t.Fatalf("expected discount amount 0, got %f", discAmt)
	}
	if status := p.DiscountStatus(now); status != "EXPIRED" {
		t.Fatalf("expected status EXPIRED, got %s", status)
	}
}

func TestProduct_EffectivePrice_BoundaryDates(t *testing.T) {
	pastStart := time.Now().Add(-1 * time.Hour)
	futureEnd := time.Now().Add(1 * time.Hour)

	p := Product{
		SellingPrice:      450,
		IsDiscountEnabled: true,
		DiscountPercent:   10,
		DiscountStartDate: &pastStart,
		DiscountEndDate:   &futureEnd,
	}

	now := time.Now()
	effPrice, discAmt, _, isActive := p.EffectivePrice(now)
	if !isActive {
		t.Fatalf("expected discount to be active between start and end date")
	}
	// 450 * 0.10 = 45 -> 405
	if effPrice != 405 {
		t.Fatalf("expected effective price 405, got %f", effPrice)
	}
	if discAmt != 45 {
		t.Fatalf("expected discount amount 45, got %f", discAmt)
	}
	if status := p.DiscountStatus(now); status != "ACTIVE" {
		t.Fatalf("expected status ACTIVE, got %s", status)
	}
}
