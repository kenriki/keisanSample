package com.cinqprobe.demo.controller;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {

	@GetMapping("/")
	public String index(Model model) {
		model.addAttribute("name", "John Doe");
		List<String> items = Arrays.asList("Item 1", "Item 2", "Item 3");
		model.addAttribute("items", items);
		return "index";
	}
	
	@GetMapping("/sample")
	public String page1(Model model) {
		return "sample1/index";
	}
}